const formatTimeAgo = (dateString, t) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    // Fallback translation helper if t is not provided or fails (basic english fallback)
    const translate = (key, params) => {
        if (t) return t(key, params);
        // Minimal fallback logic
        if (key === 'feed.justNow') return 'Just now';
        if (key === 'feed.minutesAgo') return `${params.count} minutes ago`;
        if (key === 'feed.hoursAgo') return `${params.count} hours ago`;
        if (key === 'feed.daysAgo') return `${params.count} days ago`;
        if (key === 'feed.monthsAgo') return `${params.count} months ago`;
        if (key === 'feed.yearsAgo') return `${params.count} years ago`;
        return dateString;
    };

    if (seconds < 60) return translate('feed.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return translate('feed.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return translate('feed.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return translate('feed.daysAgo', { count: days });
    const months = Math.floor(days / 30);
    if (months < 12) return translate('feed.monthsAgo', { count: months });
    return translate('feed.yearsAgo', { count: Math.floor(months / 12) });
};

export default formatTimeAgo;
