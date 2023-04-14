import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../index.js';
import db from '../db/conn.js';
import {
  mockedToken,
  testNonString,
  testNonEmpty,
  testUnexpectedField,
  testNonCaipId,
  testNonURL,
  testNonBoolean,
  testNonMongodbId,
} from './utils.js';
import { ObjectId } from 'mongodb';

chai.use(chaiHttp);
const expect = chai.expect;

const collection = db.collection('blockchains');
const blockchainPath = '/blockchains';
const blockchain = {
  caipId: 'eip155:5',
  chainId: '5',
  icon: 'https://www.grindery.io/hubfs/delight-assets/icons/blockchains/eip155-5.png',
  isActive: true,
  isEvm: true,
  isTestnet: true,
  label: 'Goerli Testnet',
  nativeTokenSymbol: 'ETH',
  rpc: [
    'https://goerli.blockpi.network/v1/rpc/public',
    'https://rpc.ankr.com/eth_goerli',
    'https://eth-goerli.public.blastapi.io',
  ],
  transactionExplorerUrl: 'https://goerli.etherscan.io/tx/{hash}',
  addressExplorerUrl: 'https://goerli.etherscan.io/address/{hash}',
};

function modifyBlockchainField({ field, value }) {
  it(`PUT /blockchains/blockchainId - ${field} - Should modify ${field}`, async function () {
    const createResponse = await chai
      .request(app)
      .post(blockchainPath)
      .set('Authorization', `Bearer ${mockedToken}`)
      .send(blockchain);
    chai.expect(createResponse).to.have.status(200);
    chai.expect(createResponse.body).to.have.property('acknowledged', true);
    chai.expect(createResponse.body).to.have.property('insertedId');

    const res = await chai
      .request(app)
      .put(`/blockchains/${createResponse.body.insertedId}`)
      .set('Authorization', `Bearer ${mockedToken}`)
      .send({ [field]: value });
    chai.expect(res).to.have.status(200);
    chai.expect(res.body).to.deep.equal({
      acknowledged: true,
      modifiedCount: 1,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 1,
    });
    const blockchainDB = await collection.findOne({
      _id: new ObjectId(createResponse.body.insertedId),
    });
    chai.expect(blockchainDB[field]).to.deep.equal(value);

    const deleteResponse = await chai
      .request(app)
      .delete(`/blockchains/${createResponse.body.insertedId}`)
      .set('Authorization', `Bearer ${mockedToken}`);
    chai.expect(deleteResponse).to.have.status(200);
  });
}

describe('Blockchains route', async function () {
  describe('POST new blockchain', () => {
    describe('Core of the route', () => {
      it('Should return 403 if no token is provided', async function () {
        const createResponse = await chai
          .request(app)
          .post(blockchainPath)
          .send(blockchain);
        chai.expect(createResponse).to.have.status(403);
      });

      it('Should create a new blockchain', async function () {
        const createResponse = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        chai.expect(createResponse).to.have.status(200);
        chai.expect(createResponse.body).to.have.property('acknowledged', true);
        chai.expect(createResponse.body).to.have.property('insertedId');

        const deleteResponse = await chai
          .request(app)
          .delete(`/blockchains/${createResponse.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
      });

      it('Should create a new blockchain with the proper fields', async function () {
        const createResponse = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        chai.expect(createResponse).to.have.status(200);
        chai.expect(createResponse.body).to.have.property('acknowledged', true);
        chai.expect(createResponse.body).to.have.property('insertedId');

        const res = await chai
          .request(app)
          .get(`/blockchains/${createResponse.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(res).to.have.status(200);
        delete res.body._id;
        chai.expect(res.body).to.deep.equal(blockchain);

        const deleteResponse = await chai
          .request(app)
          .delete(`/blockchains/${createResponse.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
      });

      it('Should create a new blockchain with the proper fields', async function () {
        const createResponse = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        chai.expect(createResponse).to.have.status(200);
        chai.expect(createResponse.body).to.have.property('acknowledged', true);
        chai.expect(createResponse.body).to.have.property('insertedId');

        const createResponse1 = await chai
          .request(app)
          .post(blockchainPath)
          .set('Authorization', `Bearer ${mockedToken}`)
          .send(blockchain);
        chai.expect(createResponse1).to.have.status(404);
        chai
          .expect(createResponse1.body)
          .to.deep.equal({ msg: 'This blockchain already exists.' });

        const deleteResponse = await chai
          .request(app)
          .delete(`/blockchains/${createResponse.body.insertedId}`)
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(deleteResponse).to.have.status(200);
      });
    });

    describe('Validators', () => {
      it('Should fail if rpc is not an array', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .post(blockchainPath)
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ ...blockchain, rpc: 'notAnArray' });

        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some(
            (err) => err.msg === 'must be an array' && err.param === 'rpc'
          )
        ).to.be.true;
      });

      it('Should fail if rpc contains non-URL values', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .post(blockchainPath)
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ ...blockchain, rpc: ['notAnURL', 123] });

        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some((err) => err.msg === 'must be an array of URL')
        ).to.be.true;
      });

      const testCases = [
        'chainId',
        'caipId',
        'label',
        'icon',
        'rpc',
        'nativeTokenSymbol',
        'transactionExplorerUrl',
        'addressExplorerUrl',
        'isEvm',
        'isTestnet',
        'isActive',
      ];

      for (const testCase of testCases) {
        if (testCase == 'caipId') {
          testNonCaipId({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'transactionExplorerUrl' ||
          testCase == 'addressExplorerUrl'
        ) {
          testNonURL({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'isEvm' ||
          testCase == 'isTestnet' ||
          testCase == 'isActive'
        ) {
          testNonBoolean({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (testCase !== 'rpc') {
          testNonString({
            method: 'post',
            path: blockchainPath,
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        }

        testNonEmpty({
          method: 'post',
          path: blockchainPath,
          body: {
            ...blockchain,
            [testCase]: '',
          },
          query: {},
          field: testCase,
        });
      }
    });
  });

  describe('GET active blockchains', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai.request(app).get('/blockchains/active');
      chai.expect(res).to.have.status(403);
    });

    it('Should return all active blockchains', async function () {
      this.timeout(50000);

      const createResponse = await chai
        .request(app)
        .post(blockchainPath)
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(blockchain);
      chai.expect(createResponse).to.have.status(200);

      const createResponse1 = await chai
        .request(app)
        .post(blockchainPath)
        .set('Authorization', `Bearer ${mockedToken}`)
        .send({ ...blockchain, caipId: 'eip155:45', isActive: false });
      chai.expect(createResponse1).to.have.status(200);

      const res = await chai
        .request(app)
        .get('/blockchains/active')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('array');

      const expectedArray = await collection
        .find({
          isActive: true,
        })
        .toArray();
      expectedArray.forEach((obj) => {
        obj._id = obj._id.toString();
      });
      chai.expect(res.body).to.deep.equal(expectedArray);
      chai.expect(res.body.every((obj) => obj.isActive === true)).to.be.true;

      const deleteResponse = await chai
        .request(app)
        .delete(`/blockchains/${createResponse.body.insertedId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);

      const deleteResponse1 = await chai
        .request(app)
        .delete(`/blockchains/${createResponse1.body.insertedId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse1).to.have.status(200);
    });

    it('Should return an empty array if no blockchain found', async function () {
      const res = await chai
        .request(app)
        .get('/blockchains/active')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('array').that.is.empty;
    });
  });

  describe('GET blockchain by MongoDBId', () => {
    it('Should return 403 if no token is provided', async function () {
      const res = await chai.request(app).get('/blockchains/1234');
      chai.expect(res).to.have.status(403);
    });

    it('Should return blockchain with the proper blockchainId', async function () {
      this.timeout(50000);

      const createResponse = await chai
        .request(app)
        .post(blockchainPath)
        .set('Authorization', `Bearer ${mockedToken}`)
        .send(blockchain);
      chai.expect(createResponse).to.have.status(200);

      const res = await chai
        .request(app)
        .get(`/blockchains/${createResponse.body.insertedId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object');
      chai
        .expect(res.body._id.toString())
        .to.be.equal(createResponse.body.insertedId);

      const deleteResponse = await chai
        .request(app)
        .delete(`/blockchains/${createResponse.body.insertedId}`)
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(deleteResponse).to.have.status(200);
    });

    it('Should return null if no blockchain found', async function () {
      const res = await chai
        .request(app)
        .get('/blockchains/111111111111111111111111')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object').that.is.empty;
    });

    it('Should return null if no blockchain found', async function () {
      const res = await chai
        .request(app)
        .get('/blockchains/111111111111111111111111')
        .set('Authorization', `Bearer ${mockedToken}`);
      chai.expect(res).to.have.status(200);
      chai.expect(res.body).to.be.an('object').that.is.empty;
    });

    testNonMongodbId({
      method: 'get',
      path: '/blockchains/1111111111111111',
      body: {},
      query: {},
      field: 'blockchainId',
    });
  });

  describe('PUT blockchain', () => {
    describe('Core of the route', () => {
      it('Should return 403 if no token is provided', async function () {
        const res = await chai.request(app).put('/blockchains/1234');
        chai.expect(res).to.have.status(403);
      });
      modifyBlockchainField({ field: 'chainId', value: 'modifiedChainId' });
      modifyBlockchainField({ field: 'caipId', value: 'eip155:343' });
      modifyBlockchainField({ field: 'label', value: 'newLabel' });
      modifyBlockchainField({ field: 'icon', value: 'newIcon' });
      modifyBlockchainField({
        field: 'rpc',
        value: [
          'https://new.goerli.blockpi.network/v1/rpc/public',
          'https://new.rpc.ankr.com/eth_goerli',
          'https://new.eth-goerli.public.blastapi.io',
        ],
      });
      modifyBlockchainField({
        field: 'nativeTokenSymbol',
        value: 'newNativeTokenSymbol',
      });
      modifyBlockchainField({ field: 'isEvm', value: !blockchain.isEvm });
      modifyBlockchainField({
        field: 'isTestnet',
        value: !blockchain.isTestnet,
      });
      modifyBlockchainField({ field: 'isActive', value: !blockchain.isActive });
      modifyBlockchainField({
        field: 'transactionExplorerUrl',
        value: 'https://new.goerli.etherscan.io/tx/{hash}',
      });
      modifyBlockchainField({
        field: 'addressExplorerUrl',
        value: 'https://new.goerli.etherscan.io/address/{hash}',
      });
      it('Should fail if no blockchain found', async function () {
        const res = await chai
          .request(app)
          .put('/blockchains/111111111111111111111111')
          .set('Authorization', `Bearer ${mockedToken}`);
        chai.expect(res).to.have.status(404);
        chai.expect(res.body).to.deep.equal({ msg: 'No blockchain found' });
      });
    });
    describe('Validators', () => {
      it('PUT /blockchains/11111111111111111111 - rpc - Should fail if rpc is not an array', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .put('/blockchains/11111111111111111111')
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ rpc: 'notAnArray' });
        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some(
            (err) => err.msg === 'must be an array' && err.param === 'rpc'
          )
        ).to.be.true;
      });
      it('PUT /blockchains/11111111111111111111 - rpc - Should fail if rpc contains non-URL values', async function () {
        // Make a request to create the offer with invalid data
        const res = await chai
          .request(app)
          .put('/blockchains/11111111111111111111')
          .set({ Authorization: `Bearer ${mockedToken}` })
          .send({ rpc: ['notAnURL', 123] });
        // Assertions
        chai.expect(res).to.have.status(400);
        chai.expect(res.body).to.be.an('array');
        chai.expect(
          res.body.some((err) => err.msg === 'must be an array of URL')
        ).to.be.true;
      });
      const testCases = [
        'chainId',
        'caipId',
        'label',
        'icon',
        'rpc',
        'nativeTokenSymbol',
        'isEvm',
        'isTestnet',
        'isActive',
        'transactionExplorerUrl',
        'addressExplorerUrl',
      ];
      for (const testCase of testCases) {
        if (testCase == 'caipId') {
          testNonCaipId({
            method: 'put',
            path: '/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'transactionExplorerUrl' ||
          testCase == 'addressExplorerUrl'
        ) {
          testNonURL({
            method: 'put',
            path: '/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (
          testCase == 'isEvm' ||
          testCase == 'isTestnet' ||
          testCase == 'isActive'
        ) {
          testNonBoolean({
            method: 'put',
            path: '/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        } else if (testCase !== 'rpc') {
          testNonString({
            method: 'put',
            path: '/blockchains/11111111111111111111',
            body: {
              ...blockchain,
              [testCase]: 123,
            },
            query: {},
            field: testCase,
          });
        }
        testNonEmpty({
          method: 'put',
          path: '/blockchains/11111111111111111111',
          body: {
            ...blockchain,
            [testCase]: '',
          },
          query: {},
          field: testCase,
        });
      }
    });
  });
});