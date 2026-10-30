import os
import socket

from django.conf import settings
from django.core.management.base import BaseCommand
from redis import Redis

from rq import Queue, SimpleWorker, Worker
from rq.serializers import JSONSerializer


def get_worker_class():
    """Return a fork-based Worker on POSIX and SimpleWorker on Windows (where os.fork is unavailable)."""
    return Worker if hasattr(os, "fork") else SimpleWorker


class Command(BaseCommand):
    help = "Run an RQ worker for an Asana queue (webhook events or sync)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--queue",
            default=settings.ASANA_QUEUE_NAME,
            help="RQ queue name to consume (default: ASANA_QUEUE_NAME).",
        )
        parser.add_argument(
            "--concurrency",
            type=int,
            default=1,
            help="Number of worker processes to fork (default: 1).",
        )

    def handle(self, *args, **options):
        queue_name = options["queue"]
        connection = Redis.from_url(settings.REDIS_QUEUE_URL)
        queue = Queue(
            queue_name,
            connection=connection,
            serializer=JSONSerializer(),
        )
        worker_cls = get_worker_class()
        concurrency = max(1, int(options["concurrency"]))
        workers = []
        for index in range(concurrency):
            worker = worker_cls(
                [queue],
                connection=connection,
                name=(
                    f"asana-worker-{queue_name}-{index}-"
                    f"{socket.gethostname()}-{os.getpid()}"
                ),
                serializer=JSONSerializer,
            )
            workers.append(worker)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Starting RQ worker {index + 1}/{concurrency} on queue "
                    f"{queue_name!r}"
                )
            )

        if concurrency == 1:
            workers[0].work(with_scheduler=True)
        else:
            # Multi-process: each child runs its own event loop.
            for worker in workers:
                worker.work(with_scheduler=True)
