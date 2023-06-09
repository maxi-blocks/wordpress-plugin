/**
 * WordPress dependencies
 */
import { sprintf, __ } from '@wordpress/i18n';
import {
	useCallback,
	useContext,
	useEffect,
	useState,
} from '@wordpress/element';
import { resolveSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import AdvancedNumberControl from '../advanced-number-control';
import SelectControl from '../select-control';
import ToggleSwitch from '../toggle-switch';
import { validationsValues } from '../../extensions/DC/utils';
import {
	typeOptions,
	fieldOptions,
	relationOptions,
	relationTypes,
	limitOptions,
	limitTypes,
	limitFields,
	orderByOptions,
} from '../../extensions/DC/constants';
import getDCOptions from '../../extensions/DC/getDCOptions';
import DateFormatting from './custom-date-formatting';
import { getDefaultAttribute } from '../../extensions/styles';
import { getDCValues, LoopContext } from '../../extensions/DC';

/**
 * External dependencies
 */
import { isEmpty, isFinite, isNil, capitalize, isEqual } from 'lodash';
import classnames from 'classnames';
import TextControl from '../text-control';

/**
 * Styles
 */
import './editor.scss';

/**
 * Dynamic Content
 */
const DynamicContent = props => {
	const {
		className,
		onChange,
		allowCustomDate = false,
		contentType = 'text',
		...dynamicContent
	} = props;

	const contextLoop = useContext(LoopContext)?.contextLoop;

	const [postAuthorOptions, setPostAuthorOptions] = useState(null);
	const [postIdOptions, setPostIdOptions] = useState(null);

	const classes = classnames('maxi-dynamic-content', className);

	const dcValues = getDCValues(dynamicContent, contextLoop);
	const {
		status,
		type,
		relation,
		id,
		field,
		author,
		limit,
		delimiterContent,
		customDelimiterStatus,
		postTaxonomyLinksStatus,
		error,
		order,
		accumulator,
	} = dcValues;
	const delimiterOptions = [
		{ label: __('None', 'maxi-blocks'), value: '' },
		{ label: __('Comma', 'maxi-blocks'), value: ',' },
		{ label: __('Semicolon', 'maxi-blocks'), value: ';' },
		{ label: __('Custom', 'maxi-blocks'), value: 'custom' },
	];

	const changeProps = params => {
		const hasChangesToSave = Object.entries(dynamicContent).some(
			([key, val]) => {
				if (!(key in params)) return false;

				return params[key] !== val;
			}
		);

		if (hasChangesToSave) onChange(params);
	};

	const fetchDcData = useCallback(async () => {
		// TODO: check if this code is necessary
		// On init, get post author options and set current user as default
		if (!postAuthorOptions) {
			const authors = await resolveSelect('core').getUsers({
				who: 'authors',
			});

			if (authors) {
				setPostAuthorOptions(
					authors.map(({ id, name }) => ({
						label: `${id} - ${name}`,
						value: id,
					}))
				);

				if (!author) {
					const { id } = await resolveSelect('core').getCurrentUser();

					changeProps({ 'dc-author': id });
				}
			}
		}

		// Sets new content
		if (status && relationTypes.includes(type)) {
			const dataRequest = {
				type,
				id,
				field,
				postIdOptions,
				relation,
				author,
			};

			const postIDSettings = await getDCOptions(
				dataRequest,
				postIdOptions,
				contentType,
				false,
				contextLoop
			);

			if (postIDSettings) {
				const { newValues, newPostIdOptions } = postIDSettings;

				changeProps(newValues);

				if (
					!isNil(newPostIdOptions) &&
					!isEqual(postIdOptions, newPostIdOptions)
				)
					setPostIdOptions(newPostIdOptions);
			}
		}
	});

	useEffect(() => {
		fetchDcData().catch(console.error);
	}, [fetchDcData]);

	return (
		<div className={classes}>
			<ToggleSwitch
				label={__('Use dynamic content', 'maxi-blocks')}
				selected={status}
				onChange={value => changeProps({ 'dc-status': value })}
			/>
			{status && (
				<>
					<SelectControl
						label={__('Type', 'maxi-blocks')}
						value={type}
						options={typeOptions[contentType]}
						onChange={value => {
							const validatedAttributes = validationsValues(
								value,
								field,
								relation,
								contentType
							);

							changeProps({
								'dc-type': value,
								'dc-show': 'current',
								'dc-error': '',
								...validatedAttributes,
							});
						}}
						onReset={() =>
							changeProps({
								'dc-type': getDefaultAttribute('dc-type'),
							})
						}
					/>
					{isEmpty(postIdOptions) && type !== 'settings' ? (
						<p>{__('This type is empty', 'maxi-blocks')}</p>
					) : (
						<>
							{relationTypes.includes(type) && (
								<SelectControl
									label={__('Relation', 'maxi-blocks')}
									value={relation}
									options={relationOptions[contentType][type]}
									onChange={value =>
										changeProps({
											'dc-relation': value,
											'dc-show': 'current',
											'dc-error': '',
											...([
												'by-date',
												'alphabetical',
											].includes(value) && {
												'dc-order':
													orderByOptions[value][0]
														.value,
											}),
										})
									}
									onReset={() =>
										changeProps({
											'dc-relation':
												getDefaultAttribute(
													'dc-relation'
												),
										})
									}
								/>
							)}
							{type === 'users' && relation === 'by-id' && (
								<SelectControl
									label={__('Author id', 'maxi-blocks')}
									value={author}
									options={postAuthorOptions}
									onChange={value =>
										changeProps({
											'dc-author': Number(value),
										})
									}
									onReset={() =>
										changeProps({
											'dc-author':
												getDefaultAttribute(
													'dc-author'
												),
										})
									}
								/>
							)}
							{relationTypes.includes(type) &&
								type !== 'users' &&
								['author', 'by-id'].includes(relation) && (
									<SelectControl
										label={__(
											`${capitalize(type)} id`,
											'maxi-blocks'
										)}
										value={id}
										options={postIdOptions}
										onChange={value =>
											changeProps({
												'dc-error': '',
												'dc-show': 'current',
												'dc-id': Number(value),
											})
										}
										onReset={() =>
											changeProps({
												'dc-id':
													getDefaultAttribute(
														'dc-id'
													),
											})
										}
									/>
								)}
							{['posts', 'pages', 'media', 'users'].includes(
								type
							) &&
								['by-date', 'alphabetical'].includes(
									relation
								) && (
									<>
										<SelectControl
											label={__('Order', 'maxi-blocks')}
											value={order}
											options={orderByOptions[relation]}
											onChange={value =>
												changeProps({
													'dc-order': value,
												})
											}
											onReset={() =>
												changeProps({
													'dc-order':
														getDefaultAttribute(
															'dc-order'
														),
												})
											}
										/>
										<AdvancedNumberControl
											label={__(
												'Accumulator',
												'maxi-blocks'
											)}
											value={accumulator}
											onChangeValue={value =>
												changeProps({
													'dc-accumulator': value,
												})
											}
											onReset={() =>
												changeProps({
													'dc-accumulator':
														getDefaultAttribute(
															'dc-accumulator'
														),
												})
											}
											disableRange
										/>
									</>
								)}
							{(['settings'].includes(type) ||
								(relation === 'by-id' && isFinite(id)) ||
								(relation === 'author' &&
									!isEmpty(postIdOptions)) ||
								[
									'date',
									'modified',
									'random',
									'by-date',
									'alphabetical',
								].includes(relation)) && (
								<SelectControl
									label={__('Field', 'maxi-blocks')}
									value={field}
									options={fieldOptions[contentType][type]}
									onChange={value =>
										changeProps({
											'dc-field': value,
										})
									}
									onReset={() =>
										changeProps({
											'dc-field':
												fieldOptions[contentType][
													type
												][0]?.value,
										})
									}
								/>
							)}
							{limitTypes.includes(type) &&
								limitFields.includes(field) &&
								!error && (
									<AdvancedNumberControl
										label={__(
											'Character limit',
											'maxi-blocks'
										)}
										value={limit}
										onChangeValue={value =>
											changeProps({
												'dc-limit': Number(value),
											})
										}
										disableReset={limitOptions.disableReset}
										step={limitOptions.steps}
										withInputField={
											limitOptions.withInputField
										}
										onReset={() =>
											changeProps({
												'dc-limit':
													getDefaultAttribute(
														'dc-limit'
													),
											})
										}
										min={limitOptions.min}
										max={limitOptions.max}
										initialPosition={
											limit || limitOptions.defaultValue
										}
									/>
								)}
							{field === 'date' && !error && (
								<DateFormatting
									allowCustomDate={allowCustomDate}
									onChange={obj => changeProps(obj)}
									{...dcValues}
								/>
							)}
							{['tags', 'categories'].includes(field) && !error && (
								<>
									<ToggleSwitch
										label={__(
											sprintf('Use %s links', field),
											'maxi-blocks'
										)}
										selected={postTaxonomyLinksStatus}
										onChange={value =>
											changeProps({
												'dc-post-taxonomy-links-status':
													value,
											})
										}
									/>
									<SelectControl
										label={__('Delimiter', 'maxi-blocks')}
										value={
											customDelimiterStatus
												? 'custom'
												: delimiterContent
										}
										options={delimiterOptions}
										onChange={value => {
											changeProps(
												value === 'custom'
													? {
															'dc-custom-delimiter-status': true,
													  }
													: {
															'dc-custom-delimiter-status': false,
															'dc-delimiter-content':
																value,
													  }
											);
										}}
									/>
									{customDelimiterStatus && (
										<TextControl
											className='maxi-dynamic-content__custom-delimiter'
											label={__(
												'Custom delimiter',
												'maxi-blocks'
											)}
											value={delimiterContent}
											onChange={value =>
												changeProps({
													'dc-delimiter-content':
														value,
												})
											}
										/>
									)}
								</>
							)}
						</>
					)}
				</>
			)}
		</div>
	);
};

export default DynamicContent;
