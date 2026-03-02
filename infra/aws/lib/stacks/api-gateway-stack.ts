import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import {
  RestApi,
  LambdaIntegration,
  RequestValidator,
  TokenAuthorizer,
  IdentitySource,
  AuthorizationType,
  EndpointType,
  MethodLoggingLevel,
} from 'aws-cdk-lib/aws-apigateway';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiGatewayStackProps extends StackProps {
  webhookIngestFunction: Function;
}

/**
 * API Gateway Stack
 * Creates REST API for webhook ingestion (Meta WA callbacks, provider DLR, etc.)
 *
 * Endpoint: POST hooks.iwbsend.com/v1/webhooks/{provider}
 * - Provider: 'meta-wa', 'telnyx', 'sparrow', 'aakash', etc.
 * - Authenticated via X-Webhook-Secret header (HMAC verification in Lambda)
 */
export class ApiGatewayStack extends Stack {
  public readonly api: RestApi;
  public readonly webhookResource: any;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    // Create REST API
    this.api = new RestApi(this, 'WebhookApi', {
      restApiName: 'iwb-webhook-api',
      description: 'iWB Send Webhook Ingestion API',
      endpointTypes: [EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'prod',
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
    });

    // Request validator for all incoming requests
    const requestValidator = new RequestValidator(this, 'RequestValidator', {
      restApi: this.api,
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    // /v1 resource
    const v1Resource = this.api.root.addResource('v1');

    // /v1/webhooks resource
    const webhooksResource = v1Resource.addResource('webhooks');

    // /v1/webhooks/{provider} resource (e.g., /v1/webhooks/meta-wa)
    this.webhookResource = webhooksResource.addResource('{provider}');

    // POST /v1/webhooks/{provider}
    // Lambda integration
    const webhookIntegration = new LambdaIntegration(
      props.webhookIngestFunction,
      {
        proxy: false,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.json("$")',
            },
          },
          {
            statusCode: '400',
            selectionPattern: '.*INVALID.*',
          },
          {
            statusCode: '401',
            selectionPattern: '.*AUTH.*',
          },
          {
            statusCode: '500',
            selectionPattern: '.*ERROR.*',
          },
        ],
      }
    );

    this.webhookResource.addMethod('POST', webhookIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      requestValidator,
      methodResponses: [
        { statusCode: '200', responseModels: { 'application/json': undefined } },
        { statusCode: '400' },
        { statusCode: '401' },
        { statusCode: '500' },
      ],
      requestParameters: {
        'method.request.header.X-Webhook-Secret': true,
        'method.request.path.provider': true,
      },
    });

    // Also support GET for webhook verification (Meta WA, others may use it)
    this.webhookResource.addMethod('GET', webhookIntegration, {
      methodResponses: [
        { statusCode: '200' },
        { statusCode: '400' },
      ],
      requestParameters: {
        'method.request.path.provider': true,
      },
    });

    // Output the webhook API endpoint
    new CfnOutput(this, 'WebhookApiEndpoint', {
      value: this.api.url,
      exportName: 'iwb-webhook-api-endpoint',
      description: 'Webhook API endpoint (hooks.iwbsend.com)',
    });

    new CfnOutput(this, 'WebhookResourcePath', {
      value: this.webhookResource.path,
      exportName: 'iwb-webhook-resource-path',
      description: 'Webhook resource path (/v1/webhooks/{provider})',
    });
  }
}
