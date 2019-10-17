/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

let event = { Records:
    [ { messageId: '',
        receiptHandle:
         '',
        body:
         '{"version":"","id":"","detail-type":"AWS API Call via CloudTrail","source":"aws.iam","account":"000000000","time":"","region":"","resources":[],"detail":{"eventVersion":"","userIdentity":{"type":"","principalId":"AFGHJKJHGFDFG:@","arn":"arn:aws:sts:::dragon-flyer/daenerys-targaryen","accountId":"000000000","accessKeyId":"SDFGHJKDFGHJF","sessionContext":{"attributes":{"mfaAuthenticated":"","creationDate":""},"sessionIssuer":{"type":"Role","principalId":"DFGHJKDFGHJKFGI","arn":"arn:aws:iam::000000000000:role/DevGenAdmin","accountId":"000000000000","userName":"DevGenAdmin"}}},"eventTime":"  ","eventSource":"iam.amazonaws.com","eventName":"CreateUser","awsRegion":"us-east-1","sourceIPAddress":"  00.000.000.000","userAgent":"console.amazonaws.com","requestParameters":{"userName":"tester2","tags":[]},"responseElements":{"user":{"path":"/","arn":"arn:aws:iam::00000000000:user/tester2","userId":"AIDAZZ4ORNFDESYHEX2M5","createDate":"","userName":"tester2"}},"requestID":"","eventID":"","eventType":"AwsApiCall"}}',
        attributes: [Object],
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN:
         '',
        awsRegion: 'us-east-1' } ] };

module.exports.event = event;