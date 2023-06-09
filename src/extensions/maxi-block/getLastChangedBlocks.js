/**
 * WordPress dependencies
 */
import { select } from '@wordpress/data';

/**
 * External dependencies
 */
import { diff } from 'deep-object-diff';

const getLastChangedBlocks = () => {
	const { getEntityRecordEdits, getUndoEdit } = select('core');

	const undoEdit = getUndoEdit();

	if (!undoEdit) return false;

	const entityRecordEdit = getEntityRecordEdits(
		'postType',
		undoEdit.name,
		undoEdit.recordId
	);

	const diffBlocks = diff(undoEdit?.edits?.blocks, entityRecordEdit?.blocks);

	if (typeof diffBlocks !== 'object') return false;

	return Object.values(diffBlocks);
};

export default getLastChangedBlocks;
