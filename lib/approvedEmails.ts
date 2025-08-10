export const approvedEmails = [
  "admin@company.com",
  "cfo@company.com",
  "finance@company.com",
  // Add more approved emails here
]

export function isEmailApproved(email: string): boolean {
  return approvedEmails.includes(email.toLowerCase())
}
