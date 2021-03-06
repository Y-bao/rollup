import Scope from '../scopes/Scope';
import ReturnValueScope from '../scopes/ReturnValueScope';
import BlockStatement, { isBlockStatement } from './BlockStatement';
import CallOptions from '../CallOptions';
import ExecutionPathOptions from '../ExecutionPathOptions';
import { ObjectPath } from '../variables/VariableReassignmentTracker';
import { ForEachReturnExpressionCallback, SomeReturnExpressionCallback } from './shared/Expression';
import { PatternNode } from './shared/Pattern';
import { NodeType } from './NodeType';
import { ExpressionNode, NodeBase } from './shared/Node';

export default class ArrowFunctionExpression extends NodeBase {
	type: NodeType.ArrowFunctionExpression;
	body: BlockStatement | ExpressionNode;
	params: PatternNode[];
	scope: ReturnValueScope;

	bindNode () {
		isBlockStatement(this.body)
			? this.body.bindImplicitReturnExpressionToScope()
			: this.scope.addReturnExpression(this.body);
	}

	forEachReturnExpressionWhenCalledAtPath (
		path: ObjectPath,
		callOptions: CallOptions,
		callback: ForEachReturnExpressionCallback,
		options: ExecutionPathOptions
	) {
		path.length === 0
		&& this.scope.forEachReturnExpressionWhenCalled(callOptions, callback, options);
	}

	hasEffects (_options: ExecutionPathOptions) {
		return false;
	}

	hasEffectsWhenAccessedAtPath (path: ObjectPath, _options: ExecutionPathOptions) {
		return path.length > 1;
	}

	hasEffectsWhenAssignedAtPath (path: ObjectPath, _options: ExecutionPathOptions) {
		return path.length > 1;
	}

	hasEffectsWhenCalledAtPath (path: ObjectPath, _callOptions: CallOptions, options: ExecutionPathOptions): boolean {
		if (path.length > 0) {
			return true;
		}
		return (
			this.params.some(param => param.hasEffects(options)) ||
			this.body.hasEffects(options)
		);
	}

	initialiseChildren () {
		this.params.forEach(param =>
			param.initialiseAndDeclare(this.scope, 'parameter', null)
		);
		if ((<BlockStatement>this.body).initialiseAndReplaceScope) {
			(<BlockStatement>this.body).initialiseAndReplaceScope(new Scope({ parent: this.scope }));
		} else {
			this.body.initialise(this.scope);
		}
	}

	initialiseScope (parentScope: Scope) {
		this.scope = new ReturnValueScope({ parent: parentScope });
	}

	someReturnExpressionWhenCalledAtPath (
		path: ObjectPath,
		callOptions: CallOptions,
		predicateFunction: SomeReturnExpressionCallback,
		options: ExecutionPathOptions
	): boolean {
		return (
			path.length > 0 ||
			this.scope.someReturnExpressionWhenCalled(
				callOptions,
				predicateFunction,
				options
			)
		);
	}
}
