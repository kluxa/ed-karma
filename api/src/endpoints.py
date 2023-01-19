
import datetime
import logging

from flask import (
    abort, Blueprint, current_app, g, jsonify, request
)

from .auth import api_key_required
from .db import get_db

bp = Blueprint('scores', __name__)

########################################################################

@bp.get('/scores')
@api_key_required
def get_scores():
    res = {}

    args = request.args
    if args.get('posts'):
        res['posts'] = retrieve_scores('Posts', args.get('posts'))

    if args.get('replies'):
        res['replies'] = retrieve_scores('Replies', args.get('replies'))

    return jsonify(res)

def retrieve_scores(table_name, str_ids):
    if str_ids == '':
        return []

    try:
        ids = list(map(int, str_ids.split(',')))
    except ValueError as e:
        abort(400)

    db = get_db()
    res = db.execute(
        f'select * from {table_name} where ' +
        ' or '.join(map(lambda id: 'id = ' + str(id), ids))
    ).fetchall()

    return [dict(row) for row in res]

########################################################################

@bp.put('/scores')
@api_key_required
def put_scores():
    try:
        body = request.json

        if body.get('posts'):
            update_scores('Posts', body.get('posts'))

        if body.get('replies'):
            update_scores('Replies', body.get('replies'))

        return '', 204

    except Exception as e:
        log_error(e)
        abort(400)

def update_scores(table_name, records):
    log_records(table_name, records)

    db = get_db()
    db.executemany(
        f'insert or replace into {table_name} values (?, ?, ?, ?)',
        map(record_to_tuple, records.values())
    )
    db.commit()

def log_records(table_name, records):
    logger = logging.getLogger('updates')
    for r in records.values():
        t = record_to_tuple(r)
        logger.info(
            f'inserting {t} into {table_name}', extra={'user': g.user}
        )

def record_to_tuple(r):
    return (
        int(r['id']), int(r['userId']), r['userName'], int(r['karma'])
    )

########################################################################

@bp.get('/summary')
@api_key_required
def summary():
    db = get_db()

    res = db.execute('''
select   userId, userName, sum(posts) as posts,
         sum(replies) as replies, sum(karma) as karma
from     ( select userId, userName, 1 as posts, 0 as replies, karma
           from   Posts

           union all

           select userId, userName, 0 as posts, 1 as replies, karma
           from   Replies
         )
where    karma > 0
group by userId;
    ''').fetchall()

    result = [dict(row) for row in res]
    return jsonify(result)

########################################################################

def log_error(exception):
    now = datetime.datetime.now()
    s = now.strftime('%Y-%m-%d-%H-%M-%S-%f')
    with open(f'{current_app.instance_path}/errors/{s}.log', 'w') as f:
        f.write(f'Exception: {exception}\n')
        f.write(f'Method: {request.method}\n')
        f.write(f'Path: {request.path}\n')
        f.write(f'Query string: {request.query_string.decode()}\n')
        f.write(f'Headers:\n{request.headers}\n')
        f.write(f'Body:\n{str(request.data.decode())}\n')
