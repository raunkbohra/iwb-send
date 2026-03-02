export default function DocsHome() {
  return (
    <>
      <h1>Documentation</h1>
      <p>Welcome to iWB Send documentation. Learn how to integrate our API into your application.</p>

      <h2>Getting Started</h2>
      <ol>
        <li><a href="/docs/quickstart">Follow the quickstart guide</a> to send your first message in 5 minutes</li>
        <li><a href="/docs/authentication">Set up authentication</a> with your API key</li>
        <li><a href="/docs/sms">Choose a channel</a> (SMS, Email, WhatsApp, or Voice)</li>
        <li><a href="/docs/api">Reference the API documentation</a> for detailed endpoints</li>
      </ol>

      <h2>Popular Topics</h2>
      <ul>
        <li><a href="/docs/sms">Sending SMS Messages</a></li>
        <li><a href="/docs/email">Sending Email</a></li>
        <li><a href="/docs/whatsapp">WhatsApp Integration</a></li>
        <li><a href="/docs/voice">Voice Calls</a></li>
        <li><a href="/docs/webhooks">Receiving Webhooks</a></li>
        <li><a href="/docs/errors">Error Handling</a></li>
      </ul>

      <h2>Code Examples</h2>
      <p>All examples are available in multiple languages. Code samples coming soon!</p>

      <h2>Need Help?</h2>
      <p>
        Can't find what you're looking for? <a href="/contact">Contact our support team</a> or check out our <a href="/blog">blog</a> for tutorials.
      </p>
    </>
  );
}
