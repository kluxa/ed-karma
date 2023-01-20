
import logging
import os

from flask import Flask
from flask_cors import CORS

def configure_logging(instance_path):
    logger = logging.getLogger('updates')
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler(f'{instance_path}/updates.log')
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter(
        '[%(asctime)s][%(user)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))
    logger.addHandler(handler)

def create_app(test_config=None):
    app = Flask(
        __name__,
        instance_relative_config=True,
    )
    CORS(app)

    app.config.from_mapping(
        DATABASE=os.path.join(app.instance_path, 'edkarma.sqlite'),
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    configure_logging(app.instance_path)

    from . import setup
    setup.init_app(app)

    from . import db
    db.init_app(app)

    from . import endpoints
    app.register_blueprint(endpoints.bp)

    return app
