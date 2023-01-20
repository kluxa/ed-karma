
import os
import random
import shutil
import string

import click
from flask import current_app

from . import db

def init_app(app):
    app.cli.add_command(setup_app)

@click.command('setup')
@click.argument('users_file')
def setup_app(users_file):
    '''Sets up the app.

    USERS_FILE is a file containing a list of users, one per line'''

    click.echo('Setting up the app...')
    setup_db()
    setup_config(users_file)
    setup_error_log_dir()

def setup_db():
    db_path = current_app.config['DATABASE']
    if os.path.exists(db_path):
        if click.confirm(
            'A database already exists. Would you like to create a '
            'new empty database?'
        ):
            backup_db()
            db.init_db()
    else:
        db.init_db()

def backup_db():
    i = 1
    db_path = current_app.config['DATABASE']
    while os.path.exists(f'{db_path}.{i}'):
        i += 1

    shutil.move(db_path, f'{db_path}.{i}')
    click.echo(
        'The existing database was moved to ' +
        f'{os.path.basename(db_path)}.{i}'
    )

def setup_config(users_file):
    config_path = os.path.join(current_app.instance_path, 'config.py')
    existing_api_keys = current_app.config.get('API_KEYS', {})
    if os.path.exists(config_path):
        if click.confirm(
            'A configuration file already exists. Would you like to '
            'remove the existing configuration?'
        ):
            existing_api_keys = {}

    create_config(users_file, existing_api_keys)

def create_config(users_file, existing_api_keys):
    d = existing_api_keys
    with open(users_file) as f:
        for line in f.readlines():
            user = line.strip()
            if user in d.values():
                continue
            api_key = generate_api_key()
            while api_key in d:
                api_key = generate_api_key()
            
            d[api_key] = user

    config_path = os.path.join(current_app.instance_path, 'config.py')
    with open(config_path, 'w') as f:
        f.write('API_KEYS = {\n')
        for api_key, user in d.items():
            f.write(f"\t{repr(api_key)}: {repr(user)},\n")
        f.write("}\n")

def generate_api_key():
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for i in range(32))

def setup_error_log_dir():
    os.makedirs(
        os.path.join(current_app.instance_path, 'error-logs'),
        exist_ok=True,
    )
