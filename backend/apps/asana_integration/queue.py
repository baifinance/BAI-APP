from redis import Redis
from rq import Queue, Retry
from rq.serializers import JSONSerializer

from django.conf import settings

_queue = None


def get_queue():
    global _queue
    if _queue is None:
        connection = Redis.from_url(settings.REDIS_QUEUE_URL)
        _queue = Queue(
            settings.ASANA_QUEUE_NAME,
            connection=connection,
            serializer=JSONSerializer(),
        )
    return _queue


def enqueue_webhook_event(event, digest, project_gid=None):
    from asana_integration.services.asana import process_webhook_event_job

    return get_queue().enqueue(
        process_webhook_event_job,
        event,
        digest,
        project_gid=project_gid,
        job_timeout=settings.ASANA_JOB_TIMEOUT,
        retry=Retry(max=settings.ASANA_JOB_MAX_RETRIES, interval=[10, 30, 60]),
    )


def enqueue_login_sync_job(user_id, email):
    """Background RQ job to create missing LoanApplication rows for a client.

    Scans all configured Asana projects for tasks containing ``email`` and
    creates one application per matched client. Runs outside the login
    response thread so login stays fast.
    """
    from asana_integration.services.loan_sync import sync_client_applications

    return sync_client_applications(email, publish=True)
