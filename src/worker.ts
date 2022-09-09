import { clamp } from './math';
import { WorkerClient } from './worker_client';
import { TToWorkerMessage, TFromWorkerMessage } from './worker_types';
import { StatusHandler } from './status';
import { AppError } from './util/error_util';

export function doWork(message: TToWorkerMessage): TFromWorkerMessage {
    try {
        switch (message.action) {
            case 'Import':
                return {
                    action: 'Import',
                    result: WorkerClient.Get.import(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
        }
    } catch (e: any) {
        return { action: e instanceof AppError ? 'KnownError' : 'UnknownError', error: e as Error };
    }

    return { action: 'KnownError', error: new AppError('Worker could not handle message') };         

}

