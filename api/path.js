export const config={runtime:"edge"};

export default function handler(request) {
    const url = new URL(request.url);
    const destination = new URL(url.pathname + url.search, process.env.BACKEND_URL);
    return fetch(destination, request);
}