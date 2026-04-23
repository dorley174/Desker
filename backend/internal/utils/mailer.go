package utils

import (
	"context"
	"fmt"
	"net/smtp"
)

// PasswordResetEmailSender sends password reset codes to users.
type PasswordResetEmailSender interface {
	SendPasswordResetCode(ctx context.Context, to, code string) error
}

type SMTPEmailSender struct {
	host     string
	port     int
	username string
	password string
	from     string
}

func NewSMTPEmailSender(host string, port int, username, password, from string) *SMTPEmailSender {
	return &SMTPEmailSender{host: host, port: port, username: username, password: password, from: from}
}

func (s *SMTPEmailSender) SendPasswordResetCode(_ context.Context, to, code string) error {
	if s.host == "" || s.from == "" {
		fmt.Printf("[dev-mailer] password reset code for %s: %s\n", to, code)
		return nil
	}

	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	subject := "Desker password reset code"
	body := fmt.Sprintf("Your Desker password reset code is: %s\nIt expires in 15 minutes.", code)
	msg := []byte("Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n" +
		body + "\r\n")

	if err := smtp.SendMail(addr, auth, s.from, []string{to}, msg); err != nil {
		return fmt.Errorf("send password reset email: %w", err)
	}
	return nil
}
