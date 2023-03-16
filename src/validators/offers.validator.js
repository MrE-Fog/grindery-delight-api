import { body, validationResult, query, param } from 'express-validator';

export const createOfferValidator = [
  body('chain')
    .isNumeric()
    .withMessage('must be numeric value')
    .notEmpty()
    .withMessage('must not be empty'),
  body('min')
    .isString()
    .withMessage('must be string value')
    .notEmpty()
    .withMessage('must not be empty'),
  body('max')
    .isString()
    .withMessage('must be string value')
    .notEmpty()
    .withMessage('must not be empty'),
  body('tokenId')
    .isNumeric()
    .withMessage('must be numeric value')
    .notEmpty()
    .withMessage('must not be empty'),
  body('token')
    .isString()
    .withMessage('must be string value')
    .notEmpty()
    .withMessage('must not be empty'),
  body('tokenAddress')
    .isString()
    .withMessage('must be string value')
    .notEmpty()
    .withMessage('must not be empty'),
  body('isActive')
    .isBoolean()
    .withMessage('must be boolean value')
    .notEmpty()
    .withMessage('must not be empty'),
];

export const getOfferByIdValidator = [
  param('idOffer')
    .isMongoId()
    .withMessage('must be a valid mongodb id')
    .notEmpty()
    .withMessage('must not be empty'),
];

export const deleteOfferValidator = [
  param('idOffer')
    .isMongoId()
    .withMessage('must be a valid mongodb id')
    .notEmpty()
    .withMessage('must not be empty'),
];

export const updateOfferValidator = [
  param('idOffer')
    .isMongoId()
    .withMessage('must be a valid mongodb id')
    .notEmpty()
    .withMessage('must not be empty'),
];

export const validateResult = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array();
  }
  return [];
};