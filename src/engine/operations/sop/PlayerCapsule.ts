import {BaseSopOperation} from './_Base';
import {DefaultOperationParams} from '../_Base';
import {CoreGroup} from '../../../core/geometry/Group';
import {createPlayerGeometry} from '../../../core/player/PlayerGeometry';

interface PlayerCapsuleSopParams extends DefaultOperationParams {
	radius: number;
	height: number;
}

export class PlayerCapsuleSopOperation extends BaseSopOperation {
	static readonly DEFAULT_PARAMS: PlayerCapsuleSopParams = {
		radius: 0.5,
		height: 1,
	};
	static type(): Readonly<'playerCapsule'> {
		return 'playerCapsule';
	}
	cook(input_contents: CoreGroup[], params: PlayerCapsuleSopParams) {
		return this.createCoreGroupFromGeometry(createPlayerGeometry(params));
	}
}