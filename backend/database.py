"""
Prashna-AI Database Layer — Lightweight Supabase REST client via httpx.
Replaces supabase-py which requires C build tools (pyiceberg/pyroaring).
Uses Supabase REST API (PostgREST) directly.
"""

import httpx
from backend.config import SUPABASE_URL, SUPABASE_KEY


DB_UNAVAILABLE_MSG = (
    "Database service is temporarily unavailable. "
    "Please check your internet connection and try again in a few moments."
)


def _handle_request_error(exc: Exception):
    """Convert httpx network errors into a clear RuntimeError."""
    if isinstance(exc, httpx.ConnectError):
        raise RuntimeError(DB_UNAVAILABLE_MSG) from exc
    if isinstance(exc, httpx.TimeoutException):
        raise RuntimeError(
            "Database request timed out. Please try again."
        ) from exc
    raise


class SupabaseTable:
    """Lightweight wrapper around Supabase PostgREST API."""

    def __init__(self, base_url, api_key, table_name):
        self.url = f"{base_url}/rest/v1/{table_name}"
        self.headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self._filters = []
        self._select_cols = "*"
        self._order_col = None
        self._order_desc = False
        self._limit_val = None

    def _clone(self):
        """Create a fresh copy for chaining."""
        t = SupabaseTable.__new__(SupabaseTable)
        t.url = self.url
        t.headers = dict(self.headers)
        t._filters = list(self._filters)
        t._select_cols = self._select_cols
        t._order_col = self._order_col
        t._order_desc = self._order_desc
        t._limit_val = self._limit_val
        return t

    def select(self, columns="*"):
        c = self._clone()
        c._select_cols = columns
        return c

    def eq(self, column, value):
        c = self._clone()
        c._filters.append((column, "eq", value))
        return c

    def order(self, column, desc=False):
        c = self._clone()
        c._order_col = column
        c._order_desc = desc
        return c

    def limit(self, count):
        c = self._clone()
        c._limit_val = count
        return c

    def _build_params(self):
        params = {"select": self._select_cols}
        for col, op, val in self._filters:
            params[col] = f"{op}.{val}"
        if self._order_col:
            direction = "desc" if self._order_desc else "asc"
            params["order"] = f"{self._order_col}.{direction}"
        if self._limit_val:
            params["limit"] = str(self._limit_val)
        return params

    def execute(self):
        """Execute a GET (select) query."""
        params = self._build_params()
        try:
            resp = httpx.get(self.url, headers=self.headers, params=params, timeout=30)
            resp.raise_for_status()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            _handle_request_error(exc)
        return _Result(resp.json())

    def insert(self, data):
        """Insert a record."""
        c = self._clone()

        class _Insertable:
            def __init__(self, url, headers, payload):
                self._url = url
                self._headers = headers
                self._payload = payload

            def execute(self_inner):
                try:
                    resp = httpx.post(self_inner._url, headers=self_inner._headers, json=self_inner._payload, timeout=30)
                    resp.raise_for_status()
                except (httpx.ConnectError, httpx.TimeoutException) as exc:
                    _handle_request_error(exc)
                return _Result(resp.json())

        return _Insertable(c.url, c.headers, data)

    def update(self, data):
        """Update records matching filters."""
        c = self._clone()
        c._update_data = data
        return c

    def delete(self):
        """Delete records matching filters."""
        c = self._clone()
        c._is_delete = True
        return c

    def __getattr__(self, name):
        # Handle chaining after update/delete
        if name == '_update_data':
            raise AttributeError
        if name == '_is_delete':
            raise AttributeError
        return super().__getattribute__(name)


class _UpdatableChain(SupabaseTable):
    """Handles update().eq().execute() chains."""

    def __init__(self, base):
        self.__dict__.update(base.__dict__)
        self._update_data = base._update_data if hasattr(base, '_update_data') else {}

    def execute(self):
        params = {}
        for col, op, val in self._filters:
            params[col] = f"{op}.{val}"
        try:
            resp = httpx.patch(self.url, headers=self.headers, json=self._update_data, params=params, timeout=30)
            resp.raise_for_status()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            _handle_request_error(exc)
        return _Result(resp.json())


class _DeletableChain(SupabaseTable):
    """Handles delete().eq().execute() chains."""

    def execute(self):
        params = {}
        for col, op, val in self._filters:
            params[col] = f"{op}.{val}"
        try:
            resp = httpx.delete(self.url, headers=self.headers, params=params, timeout=30)
            resp.raise_for_status()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            _handle_request_error(exc)
        return _Result(resp.json())


class _Result:
    """Mimics supabase-py result object."""

    def __init__(self, data):
        self.data = data if isinstance(data, list) else [data] if data else []


class SupabaseClient:
    """Minimal Supabase client compatible with supabase-py interface."""

    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.key = key

    def table(self, name):
        return _SmartTable(self.url, self.key, name)


class _SmartTable(SupabaseTable):
    """Enhanced table that properly handles update/delete chains."""

    def update(self, data):
        c = self._clone()
        c.__class__ = _SmartTable
        c._pending_update = data
        return c

    def delete(self):
        c = self._clone()
        c.__class__ = _SmartTable
        c._pending_delete = True
        return c

    def eq(self, column, value):
        c = super().eq(column, value)
        c.__class__ = _SmartTable
        # Carry over pending operations
        if hasattr(self, '_pending_update'):
            c._pending_update = self._pending_update
        if hasattr(self, '_pending_delete'):
            c._pending_delete = self._pending_delete
        return c

    def execute(self):
        if hasattr(self, '_pending_update'):
            params = {}
            for col, op, val in self._filters:
                params[col] = f"{op}.{val}"
            try:
                resp = httpx.patch(self.url, headers=self.headers, json=self._pending_update, params=params, timeout=30)
                resp.raise_for_status()
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                _handle_request_error(exc)
            return _Result(resp.json())
        elif hasattr(self, '_pending_delete'):
            params = {}
            for col, op, val in self._filters:
                params[col] = f"{op}.{val}"
            try:
                resp = httpx.delete(self.url, headers=self.headers, params=params, timeout=30)
                resp.raise_for_status()
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                _handle_request_error(exc)
            return _Result(resp.json())
        else:
            return super().execute()


# Initialize client
supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
