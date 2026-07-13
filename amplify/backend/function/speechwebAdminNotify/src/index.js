exports.handler = async (event) => {
  const { SESv2 } = require('@aws-sdk/client-sesv2')

  const ses = new SESv2({ region: 'us-east-1' })
  const adminEmail = 'duestech777@gmail.com'
  const { userPoolId, userName, request } = event
  const userAttrs = request.userAttributes
  const userEmail = (userAttrs.email || userName || '').replace(/[<>"']/g, '')
  const userNameDisplay = (userAttrs.name || userEmail || '').replace(/[<>"']/g, '')
  const signUpDate = new Date().toISOString().split('T')[0]
  const safePoolId = (userPoolId || '').replace(/[<>"']/g, '')

  const htmlBody = `
    <h2>New User Registration</h2>
    <p>A new user has confirmed their account on SpeechWeb.</p>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Email</td><td style="padding:8px 12px;">${escapeHtml(userEmail)}</td></tr>
      <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Name</td><td style="padding:8px 12px;">${escapeHtml(userNameDisplay)}</td></tr>
      <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">User Pool</td><td style="padding:8px 12px;">${escapeHtml(safePoolId)}</td></tr>
      <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;">Date</td><td style="padding:8px 12px;">${escapeHtml(signUpDate)}</td></tr>
    </table>
  `

  try {
    await ses.sendEmail({
      FromEmailAddress: adminEmail,
      Destination: { ToAddresses: [adminEmail] },
      Content: {
        Simple: {
          Subject: { Data: `New SpeechWeb user: ${userEmail}` },
          Body: { Html: { Data: htmlBody } },
        },
      },
    })
  } catch (err) {
    console.error('Failed to send admin notification:', err)
  }

  return event
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
