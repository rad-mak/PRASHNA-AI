/* Prashna-AI API Service — All backend communication */

const API_BASE = '/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('prashna_token') || null;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('prashna_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('prashna_token');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Longer timeout for AI-heavy endpoints, shorter for quick lookups
        const isSlowEndpoint = endpoint.includes('/quiz/generate') || endpoint.includes('/content/upload') || endpoint.includes('/content/url') || endpoint.includes('/auth/register') || endpoint.includes('/auth/login');
        const timeoutMs = isSlowEndpoint ? 120000 : 15000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        try {
            response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
                signal: controller.signal,
            });
        } catch (networkErr) {
            clearTimeout(timeoutId);
            if (networkErr.name === 'AbortError') {
                throw new Error('Request timed out — server took too long');
            }
            throw new Error('Network error — is the backend running?');
        }
        clearTimeout(timeoutId);

        if (response.status === 401) {
            this.clearToken();
            window.location.href = '/login';
            throw new Error('Session expired');
        }

        // Safely parse JSON (server may return non-JSON on 500)
        let data;
        const text = await response.text();
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error(`Server error (${response.status})`);
        }

        if (!response.ok) {
            throw new Error(data.detail || `Request failed (${response.status})`);
        }

        return data;
    }

    // Auth
    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        this.setToken(data.access_token);
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.setToken(data.access_token);
        return data;
    }

    async getProfile() {
        return this.request('/auth/me');
    }

    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    // Content
    async uploadContent(title, text, sourceType = 'text') {
        return this.request('/content/upload', {
            method: 'POST',
            body: JSON.stringify({ title, text, source_type: sourceType }),
        });
    }

    async fetchURL(url, title) {
        return this.request('/content/url', {
            method: 'POST',
            body: JSON.stringify({ url, title }),
        });
    }

    async listContent() {
        return this.request('/content/');
    }

    async getContent(id) {
        return this.request(`/content/${id}`);
    }

    async deleteContent(id) {
        return this.request(`/content/${id}`, { method: 'DELETE' });
    }

    // Quiz
    async generateQuiz(params) {
        return this.request('/quiz/generate', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async listQuizzes() {
        return this.request('/quiz/');
    }

    async getQuiz(id) {
        return this.request(`/quiz/${id}`);
    }

    async submitQuiz(quizId, answers) {
        return this.request(`/quiz/${quizId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ answers }),
        });
    }

    // Analytics
    async getPerformance() {
        return this.request('/analytics/performance');
    }

    async getKnowledgeGraph() {
        return this.request('/analytics/knowledge-graph');
    }

    async getTopicClusters() {
        return this.request('/analytics/topic-clusters');
    }

    async getWeakAreas() {
        return this.request('/analytics/weak-areas');
    }

    async getPredictions() {
        return this.request('/analytics/predictions');
    }

    // Admin
    async getAdminUsers() {
        return this.request('/admin/users');
    }

    async getAdminAnalytics() {
        return this.request('/admin/analytics');
    }

    async getAdminQuestions(flaggedOnly = false) {
        return this.request(`/admin/questions?flagged_only=${flaggedOnly}`);
    }

    async flagQuestion(questionId, reason) {
        return this.request(`/admin/questions/${questionId}/flag`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        });
    }

    async deleteQuestion(questionId) {
        return this.request(`/admin/questions/${questionId}`, {
            method: 'DELETE',
        });
    }
}

const api = new ApiService();
export default api;
