import { StatusHandler } from '../src/status';
import { LOG_MAJOR, Logger } from '../src/util/log_util';
import { WorkerClient } from '../src/worker_client';
import { AssignParams, ExportParams, ImportParams, VoxeliseParams } from '../src/worker_types';

export type THeadlessConfig = {
    import: ImportParams.Input,
    voxelise: VoxeliseParams.Input,
    assign: AssignParams.Input,
    export: ExportParams.Input,
    debug: {
        showLogs: boolean,
        showWarnings: boolean,
    }
}

export function runHeadless(headlessConfig: THeadlessConfig) {
    if (headlessConfig.debug.showLogs) {
        Logger.Get.enableLOGMAJOR();
    }
    if (headlessConfig.debug.showWarnings) {
        Logger.Get.enableLOGWARN();
    }

    const worker = WorkerClient.Get;
    {
        LOG_MAJOR('Importing...');
        worker.import(headlessConfig.import);
        StatusHandler.Get.dump().clear();
    }
    {
        LOG_MAJOR('Voxelising...');
        worker.voxelise(headlessConfig.voxelise);
        StatusHandler.Get.dump().clear();
    }
    {
        LOG_MAJOR('Assigning...');
        worker.assign(headlessConfig.assign);
        StatusHandler.Get.dump().clear();
    }
    {
        LOG_MAJOR('Exporting...');
        /**
         * The OBJExporter is unique in that it uses the actual render buffer used by WebGL
         * to create its data, in headless mode this render buffer is not created so we must
         * generate it manually
         */
        if (headlessConfig.export.exporter === 'obj') {
            worker.renderVoxelMesh({
                enableAmbientOcclusion: headlessConfig.voxelise.enableAmbientOcclusion,
                desiredHeight: headlessConfig.voxelise.desiredHeight,
            });
        }
        worker.export(headlessConfig.export);
        StatusHandler.Get.dump().clear();
    }
}
