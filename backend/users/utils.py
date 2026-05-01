LEVEL_THRESHOLDS = [
    ('expert', 7.0),
    ('avance', 5.0),
    ('intermediaire', 3.0),
    ('debutant', 0.0),
]


def check_level_up(user):
    for level, threshold in LEVEL_THRESHOLDS:
        if user.points >= threshold:
            user.level = level
            break


def add_points(user, points):
    user.points += points
    user.action_count += 1
    check_level_up(user)
    user.save(update_fields=['points', 'level', 'action_count'])
