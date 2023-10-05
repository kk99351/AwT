const express = require("express");
const PdfMailer = express.Router();
const nodemailer = require("nodemailer");
const fs = require("fs");
const pdf = require("html-pdf");
const PdfTemplate = require("../helper/PdfTemplate");
const FormPdfmodel = require("../models/FormPdfmodel");
const path = require("path");

// To get path to phantom
const phantomPath = require('witch')('phantomjs-prebuilt', 'phantomjs');

PdfMailer.post("/pdf-mailer", async (req, res) => {
  try {
    const { name, phone, citizen, srcCountry, dstCountry, email, Type } =
      req.body;

    console.log(
      "Request received:",
      name,
      phone,
      citizen,
      srcCountry,
      dstCountry,
      email
    );

    // Generate PDF
    const htmlContent = PdfTemplate(citizen, dstCountry, Type);
    const pdfOptions = {
      phantomPath,
      format: "Letter",
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    };

    // Using path to resolve path
    // as the generated file is located
    // in project root dir (/), but
    // current file is in /routes
    const pdfPath = path.join(__dirname, "..", "generated.pdf"); // Path to save the generated PDF
    await new Promise((resolve, reject) => {
      pdf.create(htmlContent, pdfOptions).toFile(pdfPath, (err) => {
        if (err) {
          console.error("PDF generation error:", err);
          return reject(err);
        }
        resolve();
      });
    });

    // Read PDF file
    const pdfBytes = fs.readFileSync(pdfPath);

    // Send email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "eclecticatmsl23@gmail.com",
        pass: "okotejdvjinfjwff",
      },
      debug: true,
    });

    const mailOptions = {
      from: "eclecticatmsl23@gmail.com",
      to: email,
      subject: "Thank You for Submitting Your Visa Application Form",
      text: `Dear`, // Your email content here
      attachments: [
        {
          filename: "generated.pdf",
          content: pdfBytes,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    // Save user data to the database
    const newUser = await FormPdfmodel.create({
      name,
      email,
      phone,
      citizen,
      srcCountry,
      dstCountry,
    });

    // Respond with success message
    res.status(200).json({ message: "Email sent successfully", user: newUser });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = PdfMailer;
