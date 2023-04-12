import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../index.js';
import db from '../db/conn.js';
import jwt from 'jsonwebtoken';
import { mockedToken } from './mock.js';
import { ObjectId } from 'mongodb';

chai.use(chaiHttp);
const expect = chai.expect;

const collection = db.collection('orders');
const offerCollection = db.collection('offers');

const orderId = 'myOrderId';

const order = {
  amountTokenDeposit: '0.34',
  addressTokenDeposit: '0x0',
  chainIdTokenDeposit: '13434',
  destAddr: 'mydestAddr',
  offerId: 'myOfferId',
  orderId: orderId,
  amountTokenOffer: '5433',
  hash: 'myhash',
};

const offerId =
  '0x02689c291c6d392ab9c02fc2a459a08cc46cc816b77cec928c86109d37ed2843';

const offer = {
  chainId: '97',
  min: '0.02',
  max: '1',
  tokenId: '45',
  token: 'BNB',
  tokenAddress: '0x0',
  hash: '0x56ee9a0e1063631dbdb5f2b8c6946aecf9a765a9470f023e3a8afb8fbf86d7a4',
  exchangeRate: '1',
  exchangeToken: 'ETH',
  exchangeChainId: '5',
  estimatedTime: '123',
  provider: '0x795beefD41337BB83903788949c8AC2D559A44a3',
  offerId: offerId,
  isActive: true,
  title: '',
  image: '',
  amount: '',
};

describe('Orders route', () => {
  describe('POST new order', () => {
    describe('Route core', () => {
      it('Should return 403 if no token is provided', async function () {
        const createResponse = await chai
          .request(app)
          .post('/orders')
          .send(order);
        chai.expect(createResponse).to.have.status(403);
      });

      it('Should POST a new order', async function () {
        const createResponse = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(order);

        chai.expect(createResponse).to.have.status(200);
        chai.expect(createResponse.body).to.have.property('acknowledged').that
          .is.true;
        chai.expect(createResponse.body).to.have.property('insertedId').that.is
          .not.empty;

        const deleteResponse = await chai
          .request(app)
          .delete(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
      });

      it('Should POST a new order with relevant fields', async function () {
        const createResponse = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(order);
        chai.expect(createResponse).to.have.status(200);

        const getOrder = await chai
          .request(app)
          .get('/orders/orderId')
          .query({ orderId: orderId })
          .set('Authorization', `Bearer ${mockedToken}`);

        // Assertions
        chai.expect(getOrder).to.have.status(200);
        chai.expect(getOrder.body).to.be.an('object');
        chai
          .expect(getOrder.body.amountTokenDeposit)
          .to.equal(order.amountTokenDeposit);
        chai
          .expect(getOrder.body.addressTokenDeposit)
          .to.equal(order.addressTokenDeposit);
        chai
          .expect(getOrder.body.chainIdTokenDeposit)
          .to.equal(order.chainIdTokenDeposit);
        chai.expect(getOrder.body.destAddr).to.equal(order.destAddr);
        chai.expect(getOrder.body.offerId).to.equal(order.offerId);
        chai.expect(getOrder.body.orderId).to.equal(order.orderId);
        chai
          .expect(getOrder.body.amountTokenOffer)
          .to.equal(order.amountTokenOffer);
        chai.expect(getOrder.body.hash).to.equal(order.hash);
        chai.expect(getOrder.body.isComplete).to.equal(false);

        const deleteResponse = await chai
          .request(app)
          .delete(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
      });

      it('Should fail if same orderId exists', async function () {
        const createResponse = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(order);
        chai.expect(createResponse).to.have.status(200);

        const createDuplicateResponse = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(order);
        chai.expect(createDuplicateResponse).to.have.status(404);
        chai
          .expect(createDuplicateResponse.body.msg)
          .to.be.equal('This order already exists.');

        const deleteResponse = await chai
          .request(app)
          .delete(`/orders/${orderId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
      });
    });

    describe('Validators', () => {
      it('Should return a 400 if orderId is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: 1234,
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('orderId');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if orderId is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('orderId');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if amountTokenDeposit is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: 10,
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('amountTokenDeposit');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if amountTokenDeposit is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('amountTokenDeposit');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if addressTokenDeposit is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: 1234,
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('addressTokenDeposit');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if addressTokenDeposit is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('addressTokenDeposit');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if chainIdTokenDeposit is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: 1,
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('chainIdTokenDeposit');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if chainIdTokenDeposit is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('chainIdTokenDeposit');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if destAddr is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: 1234,
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('destAddr');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if destAddr is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('destAddr');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if amountTokenOffer is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: 20,
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('amountTokenOffer');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if amountTokenOffer is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '',
            offerId: '5678',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('amountTokenOffer');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if offerId is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: 5678,
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('offerId');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if offerId is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '',
            hash: '0x789...',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('offerId');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if hash is not a string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: 1234,
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('hash');
        chai.expect(res.body[0].msg).to.equal('must be string value');
      });

      it('Should return a 400 if hash is an empty string', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai.expect(res.body[0].param).to.equal('hash');
        chai.expect(res.body[0].msg).to.equal('must not be empty');
      });

      it('Should return a 400 if adding an unexpected field', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send({
            orderId: '1234',
            amountTokenDeposit: '10',
            addressTokenDeposit: '0x123...',
            chainIdTokenDeposit: '1',
            destAddr: '0x456...',
            amountTokenOffer: '20',
            offerId: '5678',
            hash: '0x789...',
            unexpectedField: 'unexpected value',
          });
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai
          .expect(res.body[0].msg)
          .to.equal(
            'The following fields are not allowed in body: unexpectedField'
          );
      });

      it('Should return a 400 if an unexpected field is present in query', async function () {
        const res = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .query({
            unexpectedField: 'unexpectedValue',
          })
          .send(order);
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(res.body.length).to.equal(1);
        chai
          .expect(res.body[0].msg)
          .to.equal(
            'The following fields are not allowed in query: unexpectedField'
          );
      });
    });
  });

  describe('GET by user', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai.request(app).get('/orders/user');
      chai.expect(res).to.have.status(403);
    });

    it('Should return only orders for the given user', async function () {
      this.timeout(50000);
      const customOrder = { ...order };
      const nbrOrders = 1;
      let userId = '';
      for (let i = 0; i < nbrOrders; i++) {
        customOrder.orderId = `orderId-number${i}`;

        const createResponse = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(customOrder);
        chai.expect(createResponse).to.have.status(200);

        if (i === 0) {
          userId = (
            await collection.findOne({
              _id: new ObjectId(createResponse.body.insertedId),
            })
          ).userId;
        }
      }

      const res = await chai
        .request(app)
        .get('/orders/user')
        .set({ Authorization: `Bearer ${mockedToken}` });

      chai.expect(res).to.have.status(200);

      for (const order of res.body) {
        chai.expect(order.userId).to.equal(userId);
      }

      for (let i = 0; i < nbrOrders; i++) {
        const deleteResponse = await chai
          .request(app)
          .delete(`/orders/orderId-number${i}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
      }
    });
  });

  describe('GET by orderId', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai
        .request(app)
        .get('/orders/orderId')
        .query({ orderId: orderId });
      chai.expect(res).to.have.status(403);
    });

    it('Should get an order corresponding to orderId', async function () {
      const createResponse = await chai
        .request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(order);
      chai.expect(createResponse).to.have.status(200);

      const res = await chai
        .request(app)
        .get('/orders/orderId')
        .set('Authorization', `Bearer ${mockedToken}`)
        .query({ orderId: orderId });
      chai.expect(res).to.have.status(200);

      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object');
      chai.expect(res.body.orderId).to.equal(orderId);

      const deleteResponse = await chai
        .request(app)
        .delete(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);
    });

    it('Should return an empty string if no order exists', async function () {
      const res = await chai
        .request(app)
        .get('/orders/orderId')
        .set('Authorization', `Bearer ${mockedToken}`)
        .query({ orderId: orderId });
      chai.expect(res).to.have.status(200);

      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object');
      chai.expect(res.body).to.be.empty;
    });
  });

  describe('GET by MongoDbId', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai
        .request(app)
        .get('/orders/id')
        .query({ id: 'mongoDbId' });
      chai.expect(res).to.have.status(403);
    });

    it('Should return the order with the proper MongoDB id', async function () {
      const createResponse = await chai
        .request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(order);
      chai.expect(createResponse).to.have.status(200);

      const res = await chai
        .request(app)
        .get('/orders/id')
        .set({ Authorization: `Bearer ${mockedToken}` })
        .query({ id: createResponse.body.insertedId });

      delete res.body._id;
      delete res.body.date;
      delete res.body.userId;
      delete res.body.isComplete;

      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object');
      chai.expect(res.body).to.deep.equal(order);

      const deleteResponse = await chai
        .request(app)
        .delete(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);
    });

    it('Should return the order with the proper userId', async function () {
      const createResponse = await chai
        .request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(order);
      chai.expect(createResponse).to.have.status(200);

      const userId = (
        await collection.findOne({
          _id: new ObjectId(createResponse.body.insertedId),
        })
      ).userId;

      const res = await chai
        .request(app)
        .get('/orders/id')
        .set({ Authorization: `Bearer ${mockedToken}` })
        .query({ id: createResponse.body.insertedId });

      chai.expect(res).to.have.status(200);
      chai.expect(res.body.userId).to.equal(userId);

      const deleteResponse = await chai
        .request(app)
        .delete(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);
    });

    it('Should return an empty object if MongoDB id doesnt exist', async function () {
      const res = await chai
        .request(app)
        .get('/orders/id')
        .set({ Authorization: `Bearer ${mockedToken}` })
        .query({ id: '111111111111111111111111' });

      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object').that.is.empty;
    });
  });

  describe('GET by liquidity provider', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai.request(app).get('/orders/liquidity-provider');
      chai.expect(res).to.have.status(403);
    });

    it('Should show only orders with existing offerId in the offers collection', async function () {
      this.timeout(50000);
      const customOffer = { ...offer };
      const customOrder = { ...order };
      const nbrOffersOrders = 1;
      let customOfferIds = [];
      for (let i = 0; i < nbrOffersOrders; i++) {
        customOffer.offerId = `offerId-number${i}`;
        // isActive est true pour les i pairs, false pour les i impairs
        customOffer.isActive = i % 2 === 0;

        customOfferIds.push(customOffer.offerId);

        const newOffer = await chai
          .request(app)
          .post('/offers')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(customOffer);
        chai.expect(newOffer).to.have.status(200);

        customOrder.orderId = `orderId-number${i}`;
        customOrder.offerId = customOffer.offerId;

        const newOrder = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(customOrder);
        chai.expect(newOrder).to.have.status(200);
      }

      const res = await chai
        .request(app)
        .get('/orders/liquidity-provider')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);

      const offerIds = res.body.map((order) => order.offerId);

      chai.expect(offerIds.every((offerId) => customOfferIds.includes(offerId)))
        .to.be.true;

      for (let i = 0; i < nbrOffersOrders; i++) {
        const deleteOffer = await chai
          .request(app)
          .delete(`/offers/offerId-number${i}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteOffer).to.have.status(200);

        const deleteOrder = await chai
          .request(app)
          .delete(`/orders/orderId-number${i}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteOrder).to.have.status(200);
      }
    });

    it('Should show only orders corresponding to active offers', async function () {
      this.timeout(50000);
      const customOffer = { ...offer };
      const customOrder = { ...order };
      const nbrOffersOrders = 1;
      for (let i = 0; i < nbrOffersOrders; i++) {
        customOffer.offerId = `offerId-number${i}`;
        // isActive est true pour les i pairs, false pour les i impairs
        customOffer.isActive = i % 2 === 0;

        const newOffer = await chai
          .request(app)
          .post('/offers')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(customOffer);
        chai.expect(newOffer).to.have.status(200);

        customOrder.orderId = `orderId-number${i}`;
        customOrder.offerId = customOffer.offerId;

        const newOrder = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(customOrder);
        chai.expect(newOrder).to.have.status(200);
      }

      const res = await chai
        .request(app)
        .get('/orders/liquidity-provider')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);

      const offers = await offerCollection
        .find({ offerId: { $in: res.body.map((order) => order.offerId) } })
        .toArray();

      chai.expect(offers).to.be.an('array');
      offers.forEach((offer) => {
        chai.expect(offer.isActive).to.be.true;
      });

      for (let i = 0; i < nbrOffersOrders; i++) {
        const deleteOffer = await chai
          .request(app)
          .delete(`/offers/offerId-number${i}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteOffer).to.have.status(200);

        const deleteOrder = await chai
          .request(app)
          .delete(`/orders/orderId-number${i}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteOrder).to.have.status(200);
      }
    });

    it('Should show only orders corresponding offers created by the user', async function () {
      this.timeout(50000);
      const customOffer = { ...offer };
      const customOrder = { ...order };
      const nbrOffersOrders = 1;
      let userId = '';
      for (let i = 0; i < nbrOffersOrders; i++) {
        customOffer.offerId = `offerId-number${i}`;
        // isActive est true pour les i pairs, false pour les i impairs
        customOffer.isActive = i % 2 === 0;

        const newOffer = await chai
          .request(app)
          .post('/offers')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(customOffer);
        chai.expect(newOffer).to.have.status(200);

        customOrder.orderId = `orderId-number${i}`;
        customOrder.offerId = customOffer.offerId;

        const newOrder = await chai
          .request(app)
          .post('/orders')
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(customOrder);
        chai.expect(newOrder).to.have.status(200);

        if (i === 0) {
          userId = (
            await collection.findOne({
              _id: new ObjectId(newOrder.body.insertedId),
            })
          ).userId;
        }
      }

      const res = await chai
        .request(app)
        .get('/orders/liquidity-provider')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);

      const offers = await offerCollection
        .find({ offerId: { $in: res.body.map((order) => order.offerId) } })
        .toArray();

      chai.expect(offers).to.be.an('array');
      offers.forEach((offer) => {
        chai.expect(offer.userId).to.equal(userId);
      });

      for (let i = 0; i < nbrOffersOrders; i++) {
        const deleteOffer = await chai
          .request(app)
          .delete(`/offers/offerId-number${i}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteOffer).to.have.status(200);

        const deleteOrder = await chai
          .request(app)
          .delete(`/orders/orderId-number${i}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteOrder).to.have.status(200);
      }
    });
  });

  describe('DELETE order by orderId', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai.request(app).delete('/orders/myOrderId');
      chai.expect(res).to.have.status(403);
    });

    it('Should delete one order', async function () {
      const createResponse = await chai
        .request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(order);

      chai.expect(createResponse).to.have.status(200);

      const deleteResponse = await chai
        .request(app)
        .delete(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);
      chai.expect(deleteResponse.body.acknowledged).to.be.true;
      chai.expect(deleteResponse.body.deletedCount).to.equal(1);
    });

    it('Should delete the appropriate order', async function () {
      const createResponse = await chai
        .request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(order);

      chai.expect(createResponse).to.have.status(200);
      chai.expect(
        await collection.findOne({
          _id: new ObjectId(createResponse.body.insertedId),
        })
      ).to.not.be.empty;

      const deleteResponse = await chai
        .request(app)
        .delete(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);
      chai.expect(
        await collection.findOne({
          _id: new ObjectId(createResponse.body.insertedId),
        })
      ).to.be.null;
    });

    it('Should return 404 with message if no order found', async function () {
      const res = await chai
        .request(app)
        .delete('/orders/myOrderId')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(404);
      chai.expect(res.body).to.deep.equal({ msg: 'No order found' });
    });
  });
});
