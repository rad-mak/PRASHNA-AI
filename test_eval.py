user_ans = "linear regression - continuous numeric values logistic regression- categorical values"
corr_ans = "The main difference between linear regression and logistic regression is that linear regression is used for predicting a continuous output variable, whereas logistic regression is used for binary classification."

corr_words = set(w for w in corr_ans.replace(",", " ").replace(".", " ").split() if len(w) > 3)
user_words = set(w for w in user_ans.replace(",", " ").replace(".", " ").replace("-", " ").split() if len(w) > 3)

print("Corr words:", corr_words)
print("User words:", user_words)
print("Intersection:", corr_words.intersection(user_words))

is_correct = False
if corr_words and corr_words.intersection(user_words):
    is_correct = True

print("Is correct:", is_correct)
