/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengal and Jocelyn Borovich - 2019 :) :)
//
//Main file that controls remediation and notifications of all IAM Policy events. 
//Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

const AWS = require('aws-sdk');
AWS.config.update({region: process.env.region});
let iam = new AWS.IAM();
const Master = require("./MasterClass").handler;
let path = require("./MasterClass").path;
let stopper = require("./MasterClass").stopper;
let master = new Master();

//remediates a specific action after receiving an event log
async function handleEvent(event) { 

    let resourceName = 'policyArn'
    console.log(JSON.stringify(event));
    path.n = 'Path: ';

    //Checks the event log for any previous errors. Stops the function if there is an error. 
    if (master.errorInLog(event)) {
        path.n += 'Error In Log';
        console.log(path.n);
        return; 
    }

    //Checks if the log came from this function, quits the program if it does.
    if (await master.selfInvoked(event)) {
        path.n += 'Error in Log';
        console.log('Self Invoked');
        return;
    }

    if (event.detail.eventName == "CreatePolicy") {
        console.log(`${event.detail.requestParameters.policyName} is being inspected----------`); 
    } else {
        console.log(`${event.detail.requestParameters.policyArn} is being inspected----------`); 
    }
    
    console.log(`Event action is ${event.detail.eventName}---------- `);

    //Checks to see who is doing the action, if it's one of the two interns. RUN IT!
    if(event.detail.eventName == "CreatePolicy"){
        resourceName = "policyName";
    }
    if(master.checkKeyUser(event, resourceName)){
        //checks if the log is invalid
        if (await master.invalid(event)) {
            try {
                path.n += '1'
                await remediate(event);
            } 
            catch(e) {
                if (e.code == 'NoSuchEntity') {
                console.log(e);
                path.n += '!!';
                console.log("**************NoSuchEntity error caught**************");
                console.log(path.n);
                return e;
                }  
            }     
        } else {
            path.n += '~';
        }
    } else {
        path.n += 'Key Not Found';
    }
    console.log(path.n); 
}
async function remediate(event){

    //Sets up required parameters
    const erp = event.detail.requestParameters;
    const ere = event.detail.responseElements;
    let params = {};
    let results = master.getResults(event, {});
    path.n += '=';
    let id = erp.PolicyArn;
    if (results.Action == 'CreatePolicy') {
        id  = erp.policyName;
    }
    if (process.env.environment != 'snd' && stopper.id == id) {
       console.log(`*********Resource has already been remediated manually*********`);
       stopper.id = '';
       return;
    }

    //Decides, based on the incoming event, which function to call to perform remediation
    try {
        switch(results.Action){
            case "CreatePolicy":
                params.PolicyArn = ere.policy.arn;
                await iam.deletePolicy(params).promise();
                results.PolicyArn = ere.policy.arn;
                results.Response = "DeletePolicy";
            break;
            case "DeletePolicy":
                let arnIndex = erp.policyArn.indexOf("/" ) + 1;
                results.PolicyName = erp.policyArn.substring(arnIndex);
                results.Response = "Remediation could not be performed";
            break;
            case "CreatePolicyVersion":
                params.PolicyArn = erp.policyArn;
                let versionArray = await iam.listPolicyVersions(params).promise();
                console.log(versionArray);
                let oldVersionNum = versionArray.Versions[0].VersionId;
                let newVersionNum = versionArray.Versions[1].VersionId;
                params.VersionId = newVersionNum;
                await iam.setDefaultPolicyVersion(params).promise();
                params.VersionId = oldVersionNum;
                await iam.deletePolicyVersion(params).promise();
                results.PolicyArn = erp.policyArn;
                results.VersionId = oldVersionNum;
                results.Response = "DeletePolicyVersion";
            break;
            case "SetDefaultPolicyVersion":
                //setting the default back to 0 in the list array
                params.PolicyArn = erp.policyArn;
                let versionArray2 = await iam.listPolicyVersions(params).promise();
                params.VersionId = versionArray2.Versions[0].VersionId;
                await iam.setDefaultPolicyVersion(params).promise();
                results.PolicyArn = erp.policyArn;
                results["Old Default Version"] = erp.versionId;
                results["Reset Default Version"] = versionArray2.Versions[0].VersionId;
                results.Response = "ResetDefaultPolicyVersion";
            break;
            case "DeletePolicyVersion":
                results.PolicyArn = erp.policyArn;
                results["Deleted Version"] = erp.versionId;
                results.Response = "Remediation could not be performed";
            break;
        }
    } catch(e) {
        if (e.code == 'NoSuchEntity') {
            stopper.id = id;
            console.log(e); 
            path.n += '!!';
            console.log("**************NoSuchEntity error caught**************");
            return e;
         }
    }
    console.log("Remediation completed-----------------");
    results.Reason = 'Improper Launch';
    if(results.Response == "Remediation could not be performed") {
        delete results.Reason;
    }

    path.n += '=';
    await master.notifyUser(event, results);
}

exports.handler = handleEvent;

exports.setFunction = (value, funct) => {
    iam[value] = funct;
}
