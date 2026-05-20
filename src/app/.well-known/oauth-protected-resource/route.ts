/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728)
 * Amazon Q uses this to discover the authorization server for the MCP endpoint.
 */
export async function GET() {
  return Response.json({
    resource: 'https://main.d3vise50ulsldf.amplifyapp.com/api/mcp',
    authorization_servers: [
      'https://taskflow-auth.auth.ap-northeast-1.amazoncognito.com',
    ],
    bearer_methods_supported: ['header'],
    scopes_supported: ['openid', 'email', 'profile'],
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
