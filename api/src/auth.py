
import functools

from flask import abort, current_app, g, request

def api_key_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        apiKey = request.headers.get('X-Api-Key')
        if apiKey not in current_app.config['API_KEYS']:
            print(request.headers)
            print('Aborting with 403')
            abort(403)

        g.user = current_app.config['API_KEYS'][apiKey]
        return view(**kwargs)

    return wrapped_view
