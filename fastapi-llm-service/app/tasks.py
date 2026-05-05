from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass
from typing import Awaitable, Callable

from .models import TaskType


@dataclass
class TaskRecord:
    task_id: str
    status: str
    task_type: TaskType
    result: dict | None = None
    error: str | None = None
    created_at: float = 0
    started_at: float | None = None
    finished_at: float | None = None


class TaskStore:
    def __init__(self) -> None:
        self._tasks: dict[str, TaskRecord] = {}
        self._lock = asyncio.Lock()

    async def create(self, task_type: TaskType) -> TaskRecord:
        task_id = str(uuid.uuid4())
        record = TaskRecord(
            task_id=task_id,
            status="pending",
            task_type=task_type,
            created_at=time.time(),
        )
        async with self._lock:
            self._tasks[task_id] = record
        return record

    async def update(self, task_id: str, **updates) -> TaskRecord | None:
        async with self._lock:
            record = self._tasks.get(task_id)
            if not record:
                return None
            for key, value in updates.items():
                setattr(record, key, value)
            return record

    async def get(self, task_id: str) -> TaskRecord | None:
        async with self._lock:
            return self._tasks.get(task_id)


class TaskQueue:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[tuple[TaskRecord, Callable[[], Awaitable[dict]]]] = asyncio.Queue()

    async def enqueue(self, record: TaskRecord, handler: Callable[[], Awaitable[dict]]) -> None:
        await self._queue.put((record, handler))

    async def worker(self, store: TaskStore) -> None:
        while True:
            record, handler = await self._queue.get()
            await store.update(record.task_id, status="running", started_at=time.time())
            try:
                result = await handler()
                await store.update(
                    record.task_id,
                    status="succeeded",
                    result=result,
                    finished_at=time.time(),
                )
            except Exception as exc:
                await store.update(
                    record.task_id,
                    status="failed",
                    error=str(exc),
                    finished_at=time.time(),
                )
            finally:
                self._queue.task_done()
