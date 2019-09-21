/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

const config = require('./config.json')

//_____________________________________________________________________________
//This file is independant of a specific repository (roles, users, policies, groups) 
//and is only used for jest testing  
//_____________________________________________________________________________

//The function to call to create an event for the given test situation
//Use '' if the parameter is not needed for the current test
//**********************Parameters**********************

//env => the environment the event should come from (ex: "dev")

//launch => "console" if the event should come from console. 

//eventName => The name of the event that should come in (ex: "CreateRole")

//requestParameters => The requestParameters that define the names of the 
//resource(s) and other information about the resource and attachments. 
//Put in object form. (ex: { roleName: "Alexa", policyName: "AA" })

//responseElements => Same as requestParameters. 
//Put in object form. (ex: { roleName: "Alexa", policyName: "AA" })

function getEvent(env, launch, eventName, requestParameters, responseElements) {
    if (env == '') {
        env = 'snd';
    }
    let SI = { sessionIssuer: 'Walter White'};
    let envNum = config.devNum1;
    process.env.environment = env;

    if (env == 'prd') {
       envNum = config.prdNum1;
    } 
    if (launch.toLowerCase() != 'console') {
        SI = { DarthVader: 'Anakin Skywalker'};
    }
    if (requestParameters == '') {
        requestParameters = {resourceName: 'Demogorgon'};
    }
    if (responseElements == '') {
        responseElements = {resourceName: 'Demogorgon'};
    }

    return {
        "detail": {
            "eventVersion": "",
            "userIdentity": {
                "type": "",
                "principalId": "AJOCELYNCMATTQ:et@phonehome.net",
                "arn": "arn:aws:sts::00000000000:assumed-role/DragonFlyer/daenerys-targaryen",
                "accountId": envNum,
                "accessKeyId": "ASWHATS76UPRG",
                "userName": "Daenerys-Targaryen",
                "sessionContext": {
                    "attributes": {
                        "mfaAuthenticated": "",
                        "creationDate": ""
                    },
                    ...SI
                }
            },
            "eventTime": "",
            "eventSource": "",
            "eventName": eventName,
            "awsRegion": config.region,
            "sourceIPAddress": "000.000.000.000",
            "userAgent": "cloudformation.amazonaws.com",
            "requestParameters": {
                ...requestParameters
            },
            "responseElements": {
                ...responseElements
            },
            "requestID": "",
            "eventID": "",
            "eventType": "",
        }
    }
}

exports.handler = getEvent;

