import ParameterScope from './ParameterScope';
import Identifier from '../nodes/Identifier';
import Scope from './Scope';

export default class CatchScope extends ParameterScope {
	parent: Scope;

	addDeclaration (identifier: Identifier, options = {
		isHoisted: false
	}) {
		if (options.isHoisted) {
			return (<Scope>this.parent).addDeclaration(identifier, options);
		} else {
			return super.addDeclaration(identifier, options);
		}
	}
}
