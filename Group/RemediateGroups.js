/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengal and Jocelyn Borovich - 2019 :) :)
//
//Main file that controls remediation and notifications of all IAM Group events.
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

    console.log(JSON.stringify(event));
    path.n = 'Path: ';

    //Checks the event log for any previous errors. Stops the function if there is an error.
    if (master.errorInLog(event)) {
        path.n += 'Error in Log';
        console.log(path.n);
        return; 
    }

    //Checks if the log came from this function, quits the program if it does.
    if (await master.selfInvoked(event)) {
        path.n += 'Self Invoked';
        console.log(path.n);
        return;
    }
    
    console.log(`"${event.detail.requestParameters.groupName}" is being inspected----------`);
    console.log(`Event action is ${event.detail.eventName}---------- `);

    //Checks to see who is doing the action, if it's one of the two interns. RUN IT!
    if(master.checkKeyUser(event, "groupName")){
        //checks if the log is invalid
        if (await master.invalid(event)) {
            try {
                path.n += '1';
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
            path.n += 'Valid Launch';
        }
    } else {
        path.n += 'Key Not Found';
    }
    console.log(path.n);   
}

async function remediate(event){


    //Sets up required parameters
    const erp = event.detail.requestParameters;
    let params = {
        GroupName: erp.groupName
    };

    let results = master.getResults(event, params);
    path.n += '=';
    let id = erp.PolicyArn;
   if (results.Action == 'CreateGroup' || results.Action == 'DeleteGroup') {
      id = results.GroupName;
   } else if (results.Action == 'AttachGroupPolicy' || results.Action == 'DetachGroupPolicy') {
      id = erp.policyArn; 
   } else {
      id = erp.policyName; 
   }
   if (process.env.environment != 'snd' && stopper.id == id) {
      console.log(`*********Resource has already been remediated manually*********`);
      stopper.id = '';
      return;
   }

    //Decides, based on the incoming event, which function to call to perform remediation
    try {
        switch(results.Action){
            case "PutGroupPolicy":
                params.PolicyName = erp.policyName;
                await iam.deleteGroupPolicy(params).promise();
                results.PolicyName = erp.policyName;
                results.Response = "DeleteGroupPolicy";
            break;
            case "AttachGroupPolicy":
                params.PolicyArn = erp.policyArn;
                await iam.detachGroupPolicy(params).promise();
                results.PolicyArn = erp.policyArn;
                results.Response = "DetachGroupPolicy";
            break;
            case "DetachGroupPolicy":
                params.PolicyArn = erp.policyArn;
                await iam.attachGroupPolicy(params).promise();
                results.PolicyArn = erp.policyArn;
                results.Response = "AttachGroupPolicy";
            break;
            case "DeleteGroupPolicy":
                results.PolicyName = erp.policyName;
                results.Response = "Remediation could not be performed";
            break;
            case "CreateGroup":
                await iam.deleteGroup(params).promise();
                results.Response =  'DeleteGroup';
            break; 
            case "DeleteGroup":
                results.Response = 'Remediation could not be performed';
            break;
        };
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
    if (results.Response == 'Remediation could not be performed') {
        delete results.Reason;
    }

    path.n += '=';
    await master.notifyUser(event, results);
}

exports.handler = handleEvent;

exports.setFunction = (value, funct) => {
    iam[value] = funct;
}

