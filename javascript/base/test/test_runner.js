// Copyright 2015 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import { TestSuite } from 'base/test/test_suite.js';

// The test runner class manages execution of tests before the gamemode starts.
//
// When running tests, a Mocha-like test framework will be installed on the global scope for the
// duration of running the tests. Test suites can be defined with the describe() method, whereas
// individual test cases can be defined with the it() method. Both methods take a textual
// description as their first argument, and a JavaScript function as their second argument.
//
// A typical test suite could look like the following:
//
// describe('MyFeature', (it, beforeEach, afterEach) => {
//   let controller = null;
//
//   beforeEach(() => controller = new MyFeature());
//   afterEach(() => { controller.close(); controller = null });
//
//   it('Should be the answer to life the universe and everything.', assert => {
//     assert.equal(controller.answer(), 42);
//   });
//
//   it('Should also be larger than fourty one.', assert => {
//     assert.isAbove(controller.answer(), 41);
//   });
// });
//
// Asynchronous tests are supported by returning a promise from the test function passed to it().
// Tests returning anything that's not a promise will be considered synchronous.
//
// Las Venturas Playground will only be allowed to run when *ALL* tests included in the JavaScript
// part of the gamemode pass. Running the gamemode while there is broken functionality will lead to
// unexpected results, and major inconvenience for players.
export class TestRunner {
  constructor() {
    this.testSuites_ = [];
  }

  // Returns the number of tests that have been executed by the test runner.
  get testCount() {
    let count = 0;
    this.testSuites_.forEach(suite =>
        count += suite.testCount);

    return count;
  }

  // Requires all files that match |pattern| so that tests defined in them can be created, and then
  // executed. Returns a promise that will be resolved when all tests pass, or rejected when one or
  // more failures are observed.
  run(pattern) {
    const start = highResolutionTime();

    return new Promise(async(resolve, reject) => {
      let currentSuiteIndex = 0,
          failures = [];

      await this.loadTestSuites(pattern);

      const runNextSuite = () => {
        if (currentSuiteIndex >= this.testSuites_.length) {
          // Report to the test runner that running the tests has finished.
          try {
            reportTestsFinished(this.testCount, failures.length);
          } catch (e) {
            return;  // silently abort when the test runner is done.
          }

          // Either resolve or reject the promise based on the number of failing tests.
          failures.length > 0 ? reject(failures)
                              : resolve(highResolutionTime() - start);
          return;
        }

        // Execute the test suite. Append all failures to the |failures| array, after which the
        // next suite may be executed by calling the runNextSuite() method again.
        this.executeTestSuite(this.testSuites_[currentSuiteIndex++])
            .catch(suiteFailures => failures.push(...suiteFailures))
            .then(() => runNextSuite());
      };

      runNextSuite();
    });
  }

  // Executes all tests in |suite| sequentially. Returns a promise that will be resolved when all
  // tests in the suite have passed, or rejected when one or more tests failed.
  executeTestSuite(suite) {
    return new Promise((resolve, reject) => {
      let generator = suite.executeTestGenerator(),
          failures = [];

      let runNextTest = () => {
        let test = generator.next();
        if (test.done) {
          failures.length > 0 ? reject(failures)
                              : resolve();
          return;
        }

        // Catch failures, but make them resolve the promise in either case so that the next test
        // can continue to run. Otherwise we'd abort at the first test failure.
        test.value.catch(error => failures.push(error))
                  .then(() => runNextTest());
      };

      runNextTest();
    });
  }

  // Registers the test suite |fn| described by |description|. The suite will be immediately
  // initialized by executing |fn| and registering the test cases part of it.
  registerSuite(description, fn) {
    this.testSuites_.push(new TestSuite(description, fn));
  }

  // Loads all the test suites that match |pattern|. A global function called `describe` will be
  // made available to these files, enabling them to register their test suite(s).
  async loadTestSuites(pattern) {
    // Install the global `describe` function on the global.
    global.describe = TestRunner.prototype.registerSuite.bind(this);

    // Include all files that match |pattern| in the ./javascript/ folder.
    for (const filename of glob('javascript', pattern))
      await import(filename);

    // Remove the `describe` method from the global scope again.
    delete global.describe;
  }
};
