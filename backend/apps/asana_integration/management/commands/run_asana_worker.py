import os
import socket

from django.conf import settings
from django.core.management.base import BaseCommand

from asana_integration.queue import get_queue
from rq import Worker
from rq.serializers import JSONSerializer

class Command(BaseCommand):
    help = "Run an RQ worker for the Asana webhook queue."

    def handle(self, *args, **options):
        queue = get_queue()
        connection = queue.connection
        worker = Worker(
            [queue],
            connection=connection,
            name=f"asana-worker-{socket.gethostname()}-{os.getpid()}",
            serializer=JSONSerializer,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Starting RQ worker on queue {settings.ASANA_QUEUE_NAME!r}"
            )
        )
        worker.work(with_scheduler=True)
