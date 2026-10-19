export interface EmailConfig {
	apiKey: string;
	from: string;
}

/** Send the sign-in code through Resend's REST API (no SDK: one `fetch`). */
export async function sendOtpEmail(config: EmailConfig, to: string, otp: string) {
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: config.from,
			to: [to],
			subject: `${otp} is your Christmas Watch List code`,
			text: `Your sign-in code is ${otp}\n\nIt expires in 10 minutes. If you didn't ask for it, ignore this email.`,
			html: `<p>Your sign-in code is</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p><p>It expires in 10 minutes. If you didn't ask for it, ignore this email.</p>`
		})
	});
	if (!res.ok) {
		throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
	}
}
