import { ProgressManager } from './progress';
import { StatusHandler } from './status';
import { AppError } from './util/error_util';
import { WorkerClient } from './worker_client';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';

export function doWork(message: TToWorkerMessage): TFromWorkerMessage {
    StatusHandler.Get.clear();
    ProgressManager.Get.clear();

    try {
        switch (message.action) {
            case 'Import':
                return {
                    action: 'Import',
                    result: WorkerClient.Get.import(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'RenderMesh':
                return {
                    action: 'RenderMesh',
                    result: WorkerClient.Get.renderMesh(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'Voxelise':
                return {
                    action: 'Voxelise',
                    result: WorkerClient.Get.voxelise(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'RenderVoxelMesh':
                return {
                    action: 'RenderVoxelMesh',
                    result: WorkerClient.Get.renderVoxelMesh(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'Assign':
                return {
                    action: 'Assign',
                    result: WorkerClient.Get.assign(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'RenderBlockMesh':
                return {
                    action: 'RenderBlockMesh',
                    result: WorkerClient.Get.renderBlockMesh(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
            case 'Export':
                return {
                    action: 'Export',
                    result: WorkerClient.Get.export(message.params),
                    statusMessages: StatusHandler.Get.getAllStatusMessages(),
                };
        }
    } catch (e: any) {
        return { action: e instanceof AppError ? 'KnownError' : 'UnknownError', error: e as Error };
    }

    return { action: 'KnownError', error: new AppError('Worker could not handle message') };
}

