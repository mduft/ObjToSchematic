import { UI } from './ui/layout';
import { Renderer } from './renderer';
import { StatusHandler } from './status';
import { UIMessageBuilder } from './ui/misc';
import { OutputStyle } from './ui/elements/output';
import { ArcballCamera } from './camera';

import path from 'path';
import { TWorkerJob, WorkerController } from './worker_controller';
import { TFromWorkerMessage, TToWorkerMessage } from './worker_types';
import { LOG } from './util/log_util';
import { ASSERT } from './util/error_util';
import { EAction } from './util';

export class AppContext {
    private _ui: UI;
    private _workerController: WorkerController;
    public constructor() {
        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext('webgl');
        if (!gl) {
            throw Error('Could not load WebGL context');
        }

        this._ui = new UI(this);
        this._ui.build();
        this._ui.registerEvents();
        this._ui.disable(EAction.Simplify);

        this._workerController = new WorkerController(path.resolve(__dirname, 'worker_interface.js'));
        
        Renderer.Get.toggleIsAxesEnabled();
        ArcballCamera.Get.setCameraMode('perspective');
        ArcballCamera.Get.toggleAngleSnap();
    }

    public do(action: EAction) {
        LOG(`Doing ${action}`);
        const groupName = this._ui.uiOrder[action];
        this._ui.disable(action + 1);
        this._ui.cacheValues(action);
        StatusHandler.Get.clear();

        const actionCommand = this._getWorkerJob(action);
        const uiOutput = this._ui.getActionOutput(action);

        const jobCallback = (payload: TFromWorkerMessage) => {
            if (payload.action === 'KnownError') {
                uiOutput.setMessage(UIMessageBuilder.fromString(payload.error.message), 'error');
            } else if (payload.action === 'UnknownError') {
                uiOutput.setMessage(UIMessageBuilder.fromString('Something went wrong...'), 'error');
            } else {
                // The job was successful
                const builder = new UIMessageBuilder();
                builder.addHeading(StatusHandler.Get.getDefaultSuccessMessage(action));
                
                const infoStatuses = payload.statusMessages
                    .filter(x => x.status === 'info')
                    .map(x => x.message);
                builder.addItem(...infoStatuses);

                const warningStatuses = payload.statusMessages
                    .filter(x => x.status === 'warning')
                    .map(x => x.message);
                const hasWarnings = warningStatuses.length > 0;

                if (hasWarnings) {
                    builder.addHeading('There were some warnings:');
                    builder.addItem(...warningStatuses);
                }

                uiOutput.setMessage(builder, hasWarnings ? 'warning' : 'success');
                this._ui.getActionButton(action).removeLabelOverride();
                this._ui.enable(action);
                this._ui.enable(action + 1);
            }
        }

        this._workerController.addJob({
            id: actionCommand.id,
            payload: actionCommand.payload,
            callback: jobCallback,
        });

        this._ui.getActionButton(action).setLabelOverride('Loading...');
        this._ui.disable(action);
    }

    private _getWorkerJob(action: EAction): TWorkerJob {
        switch(action) {
            case EAction.Import:
                return this._import();
        }
        ASSERT(false);
    }

    private _import(): TWorkerJob {
        const uiElements = this._ui.layout.import.elements;

        const payload: TToWorkerMessage = {
            action: 'Import',
            params: { 
                filepath: uiElements.input.getCachedValue()
            }
        };

        const callback = (payload: TFromWorkerMessage) => {
            ASSERT(payload.action === 'Import');

            if (payload.result.triangleCount < 100_000) {
                // TODO: Queue render if appropriate
            }
        };

        return { id: 'Import', payload: payload, callback: callback };
    }

    /*
    private _simplify() {
        ASSERT(false);
    }

    private _voxelise() {
        ASSERT(this._loadedMesh);

        const uiElements = this._ui.layout.build.elements;
        const voxeliseParams: VoxeliseParams = {
            desiredHeight: uiElements.height.getDisplayValue(),
            useMultisampleColouring: uiElements.multisampleColouring.getCachedValue() === 'on',
            textureFiltering: uiElements.textureFiltering.getCachedValue() === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
            enableAmbientOcclusion: uiElements.ambientOcclusion.getCachedValue() === 'on',
            voxelOverlapRule: uiElements.voxelOverlapRule.getCachedValue(),
            calculateNeighbours: uiElements.ambientOcclusion.getCachedValue() === 'on',
        };

        const voxeliserID: TVoxelisers = uiElements.voxeliser.getCachedValue();
        const voxeliser: IVoxeliser = VoxeliserFactory.GetVoxeliser(voxeliserID);

        TIME_START('Voxelising');
        {
            this._loadedVoxelMesh = voxeliser.voxelise(this._loadedMesh, voxeliseParams);
        }
        TIME_END('Voxelising');
        TIME_START('Render Voxel Mesh');
        {
            const voxelSize = 8.0 / voxeliseParams.desiredHeight;
            Renderer.Get.useVoxelMesh(this._loadedVoxelMesh, voxelSize, voxeliseParams.enableAmbientOcclusion);
        }
        TIME_END('Render Voxel Mesh');
    }

    private _assign() {
        ASSERT(this._loadedVoxelMesh);

        const uiElements = this._ui.layout.assign.elements;

        const atlasId = uiElements.textureAtlas.getCachedValue();
        const atlas = Atlas.load(atlasId);
        ASSERT(atlas, 'Could not load atlas');

        const paletteId = uiElements.blockPalette.getCachedValue();
        const palette = Palette.load(paletteId);
        ASSERT(palette);

        const blockMeshParams: BlockMeshParams = {
            textureAtlas: atlas,
            blockPalette: palette,
            blockAssigner: uiElements.dithering.getCachedValue(),
            colourSpace: ColourSpace.RGB,
            fallable: uiElements.fallable.getCachedValue() as FallableBehaviour,
        };

        this._loadedBlockMesh = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, blockMeshParams);
        Renderer.Get.useBlockMesh(this._loadedBlockMesh);
    }

    private _export() {
        const exporterID: TExporters = this._ui.layout.export.elements.export.getCachedValue();
        const exporter: IExporter = ExporterFactory.GetExporter(exporterID);

        let filePath = remote.dialog.showSaveDialogSync({
            title: 'Save structure',
            buttonLabel: 'Save',
            filters: [exporter.getFormatFilter()],
        });

        ASSERT(this._loadedBlockMesh);
        if (filePath) {
            const fileExtension = '.' + exporter.getFileExtension();
            if (!filePath.endsWith(fileExtension)) {
                filePath += fileExtension;
            }
            exporter.export(this._loadedBlockMesh, filePath);
        }
    }
    */

    public draw() {
        Renderer.Get.update();
        this._ui.tick();
        Renderer.Get.draw();
    }
}
