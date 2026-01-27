import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing email configuration...');
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });

    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter verified successfully!');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_SERVER_USER,
      subject: 'Test Email from NoteVerse',
      text: 'If you received this, your email configuration is working!',
      html: '<p>If you received this, your email configuration is working!</p>'
    });

    console.log('Email sent successfully:', info);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      response: info.response
    });
  } catch (error: any) {
    console.error('Email test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        command: error.command
      },
      { status: 500 }
    );
  }
}
