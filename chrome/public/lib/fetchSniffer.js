// Taken from https://blog.logrocket.com/intercepting-javascript-fetch-api-requests-responses/

(function() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        let [resource, config] = args;
        const response = await originalFetch(resource, config);
        
        // response interceptor
        const json = () => response.clone().json().then((data) => {
            const url = resource.url;
            if (url.match(/^https:\/\/edstem\.org\/api\/user$/)) {
                document.dispatchEvent(new CustomEvent('fetchData', {
                    detail: {
                        type: 'user-data',
                        data: data,
                    },
                }));
            } else if (url.match(/^https:\/\/edstem\.org\/api\/threads\/.*\?.*/)) {
                document.dispatchEvent(new CustomEvent('fetchData', {
                    detail: {
                        type: 'thread-data',
                        data: data,
                    },
                }));
            }
            return data;
        });

        response.json = json;
        return response;
    }
})();
