/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Test function for RemediateGroups.js

const config = require('./config.json');

//Environment variable values defined from the config.json file.
Object.keys(config).forEach((key) => {
    process.env[key] = config[key];
})

const main = require(`./RemediateGroups`);  
const Master = require("./MasterClass").handler;
const getEvent = require('./EventCreater').handler;
let path = require("./MasterClass").path; 
let master = new Master();

//overriding the sns.publish operation to just log the message in console
master.setSns((params) => {
    console.log(`\n${params.Message}`);
    return {promise: () => {} }
});

//*******remediationTest() parameter examples**********
//event > the event that is passed to the main function. (Call getEvent())
//functionName > "detachRolePolicy" (no cap on first letter). The aws iam function you 
//want to override

//_____________getEvent() parameters for reference_____________
//env, launch, eventName, requestParameters, responseElements

describe(`Remediate Groups`, () => {

    //test calls 
    // test(`Testing DetachGroupPolicy event`, async() => {
    //     await remediationTest(getEvent('snd', "console", 'DetachGroupPolicy'), "attachGroupPolicy");
    // });
    // test(`Testing AttachGroupPolicy event`, async() => {
    //     path.n = 'Path: ';
    //     await remediationTest(getEvent('dev', "console", 'AttachGroupPolicy'), 'deleteGroup');
    // });
    // test(`Testing DeleteGroupPolicy event`, async() => {
    //     path.n = 'Path: ';
    //     await remediationTest(getEvent('snd', "console", 'DeleteGroupPolicy'), 'deleteGroupPolicy');
    // });
    test(`Testing PutGroupPolicy event`, async() => {
        path.n = 'Path: ';
        await remediationTest(getEvent('dev', "console", 'PutGroupPolicy'), 'deleteGroupPolicy');
    });
    // test(`Testing CreateGroup event`, async() => {
    //     path.n = 'Path: ';
    //     await remediationTest(getEvent('snd', "console", 'CreateGroup'), 'deleteGroup');
    // });
});

//test function
async function remediationTest(event, functionName) {

   //overriding the iam function being called so it just checks for the correct params
    await main.setFunction(functionName, (params) => {

            return {promise: () => {} }
    });
    await main.handler(event);
}