// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

const Murmur3Hash = require('features/activity_log/murmur3hash.js');

describe('Murmur3Hash', (it) => {
    it('generateHash should return 0 when key is empty', assert => {
        const generatedHashOfEmptyString = Murmur3Hash.generateHash('');
        const expectedHashOfEmptyString = 0;

        assert.equal(generatedHashOfEmptyString, expectedHashOfEmptyString);
    });

    it('generateHash should return 0 when key is null', assert => {
        const generatedHashOfNull = Murmur3Hash.generateHash(null);
        const expectedHashOfNull = 0;

        assert.equal(generatedHashOfNull, expectedHashOfNull);
    });

    it('should throw a typeerror when x86Multiply_ is directly called', assert => {
        const symbol = Symbol('x86Multiply');

        assert.throws(() => Murmur3Hash.x86Multiply_(symbol, 8, 6));
    });

    it('should throw a typeerror when x86Rotl_ is directly called', assert => {
        const symbol = Symbol('x86Rotl');

        assert.throws(() => Murmur3Hash.x86Rotl_(symbol, 8, 6));
    });

    it('should throw a typeerror when x86Fmix_ is directly called', assert => {
        const symbol = Symbol('x86Fmix');

        assert.throws(() => Murmur3Hash.x86Fmix_(symbol, 'x86Fmix'));
    });

    it('should generate a correct Murmur3-hash of the word \'test\'', assert => {
        const generatedHashOfTest = Murmur3Hash.generateHash('test');
        const expectedHashOfTest = '3127628307'; // according to http://murmurhash.shorelabs.com/
                                                 // use 2nd field: x86 - 32 bit

        assert.equal(generatedHashOfTest, expectedHashOfTest)
    });

    it('should provide the native MurmurIIIHashGenerateHash to pawn', assert => {
        Murmur3Hash.provideNativeMurmur3HashGenerateHashToPawn();

        const generatedHashOfTest = pawnInvoke('MurmurIIIHashGenerateHash', 'siS', 'test', 0);
        const expectedHashOfTest = Murmur3Hash.generateHash('test');

        assert.equal(generatedHashOfTest, expectedHashOfTest)
    })
});
