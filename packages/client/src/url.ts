export function extractServiceIdFromUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.host; // e.g. "api.example.com:443" or "api.example.com"
    } catch {
        // Fallback: if URL is relative or invalid, treat entire string as id
        return url;
    }
}
