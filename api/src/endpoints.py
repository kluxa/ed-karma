
import logging

from flask import (
    abort, Blueprint, current_app, g, jsonify, request
)

from .auth import api_key_required
from .db import get_db

bp = Blueprint('scores', __name__)

@bp.get('/scores')
@api_key_required
def get_scores():
    res = {}

    if request.args.get('posts'):
        res.update({'posts': retrieve_scores('posts', 'Posts')})

    if request.args.get('replies'):
        res.update({'replies': retrieve_scores('replies', 'Replies')})

    return jsonify(res)

def retrieve_scores(key_name, table_name):
    arg = request.args.get(key_name, '')
    if arg == '':
        return []

    try:
        ids = list(map(int, arg.split(',')))
    except ValueError:
        return abort(400)

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
    update_scores('posts', 'Posts')
    update_scores('replies', 'Replies')
    return '', 204

def update_scores(key_name, table_name):
    try:
        body = request.get_json()
        records = body[key_name]
        log_records(records, table_name)

        db = get_db()
        db.executemany(
            f'insert or replace into {table_name} values (?, ?, ?, ?)',
            map(lambda r: list(r.values()), records.values())
        )
        db.commit()

    except Exception as e:
        abort(400)

def log_records(records, table_name):
    logger = logging.getLogger('writes')
    for r_id, r in records.items():
        val = f'({r_id}, {r["userId"]}, {r["userName"]}, {r["karma"]})'
        logger.info(
            f'inserting {val} into {table_name}', extra={'user': g.user}
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
