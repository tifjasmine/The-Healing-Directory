import React from "react";

export default function PrivacyPage() {
  const colors = {
    sage: "#7a9e7e",
    cream: "#f7f3ee",
    warm: "#e8e0d4",
    text: "#2c2c28",
    muted: "#7a7a6e",
    accent: "#4a7c59",
    white: "#ffffff",
  };

  const pageStyle = {
    width: "100%",
    background: colors.cream,
    color: colors.text,
    fontFamily: "Jost, Arial, sans-serif",
    padding: "0",
    margin: "0",
    boxSizing: "border-box",
  };

  const innerStyle = {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "clamp(32px, 6vw, 56px) clamp(18px, 5vw, 32px) 72px",
    boxSizing: "border-box",
  };

  const heroStyle = {
    textAlign: "center",
    padding: "36px 0 44px",
    borderBottom: "1px solid " + colors.warm,
    marginBottom: "42px",
  };

  const logoStyle = {
    fontFamily: "Georgia, serif",
    fontSize: "13px",
    fontWeight: "300",
    letterSpacing: "0.28em",
    color: colors.sage,
    textTransform: "uppercase",
    marginBottom: "18px",
  };

  const h1Style = {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(40px, 8vw, 56px)",
    fontWeight: "300",
    color: colors.text,
    lineHeight: "1.05",
    margin: "0 0 10px",
  };

  const dateStyle = {
    fontSize: "13px",
    fontWeight: "300",
    color: colors.muted,
    letterSpacing: "0.1em",
  };

  const sectionStyle = {
    marginBottom: "42px",
    paddingBottom: "42px",
    borderBottom: "1px solid " + colors.warm,
  };

  const sectionNumStyle = {
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.18em",
    color: colors.sage,
    textTransform: "uppercase",
    marginBottom: "8px",
  };

  const h2Style = {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(26px, 5vw, 32px)",
    fontWeight: "300",
    margin: "0 0 22px",
    color: colors.text,
    lineHeight: "1.2",
  };

  const h3Style = {
    fontSize: "14px",
    fontWeight: "500",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: colors.accent,
    margin: "28px 0 10px",
  };

  const pStyle = {
    fontSize: "14px",
    fontWeight: "300",
    lineHeight: "1.9",
    color: colors.text,
    margin: "0 0 16px",
  };

  const liStyle = {
    fontSize: "14px",
    fontWeight: "300",
    lineHeight: "1.85",
    color: colors.text,
    marginBottom: "6px",
  };

  const shortStyle = {
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontSize: "15px",
    color: colors.muted,
    borderLeft: "2px solid " + colors.sage,
    paddingLeft: "16px",
    margin: "0 0 20px",
    fontWeight: "300",
    lineHeight: "1.65",
  };

  const cardStyle = {
    background: colors.white,
    border: "1px solid " + colors.warm,
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "14px",
  };

  const questionStyle = {
    fontSize: "13px",
    fontWeight: "500",
    color: colors.text,
    marginBottom: "6px",
    letterSpacing: "0.03em",
  };

  const answerStyle = {
    fontSize: "13px",
    fontWeight: "300",
    color: colors.muted,
    lineHeight: "1.7",
  };

  const linkStyle = {
    color: colors.accent,
    textDecoration: "none",
    borderBottom: "1px solid rgba(74, 124, 89, 0.35)",
    wordBreak: "break-word",
  };

  const tocStyle = {
    background: colors.white,
    border: "1px solid " + colors.warm,
    borderRadius: "8px",
    padding: "24px",
  };

  const tableWrapStyle = {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    margin: "20px 0",
  };

  const tableStyle = {
    width: "100%",
    minWidth: "680px",
    borderCollapse: "collapse",
    fontSize: "13px",
  };

  const thStyle = {
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: colors.sage,
    padding: "10px 12px",
    borderBottom: "1px solid " + colors.warm,
    textAlign: "left",
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid " + colors.warm,
    fontWeight: "300",
    color: colors.text,
    verticalAlign: "top",
    lineHeight: "1.6",
  };

  function P({ children }) {
    return <p style={pStyle}>{children}</p>;
  }

  function Short({ children }) {
    return <p style={shortStyle}>{children}</p>;
  }

  function H3({ children }) {
    return <h3 style={h3Style}>{children}</h3>;
  }

  function Section({ num, title, children, last }) {
    return (
      <section
        style={{
          ...sectionStyle,
          borderBottom: last ? "none" : sectionStyle.borderBottom,
        }}
      >
        {num ? <div style={sectionNumStyle}>{num}</div> : null}
        {title ? <h2 style={h2Style}>{title}</h2> : null}
        {children}
      </section>
    );
  }

  function List({ items }) {
    return (
      <ul style={{ paddingLeft: "22px", margin: "0 0 18px" }}>
        {items.map((item, index) => (
          <li key={index} style={liStyle}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  const summaryCards = [
    {
      q: "What personal information do we process?",
      a: "When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us, the choices you make, and the products and features you use.",
    },
    {
      q: "Do we process any sensitive personal information?",
      a: "Some information may be considered sensitive in certain jurisdictions. We may process sensitive personal information when necessary with your consent or as otherwise permitted by applicable law.",
    },
    {
      q: "Do we collect any information from third parties?",
      a: "We do not collect any information from third parties.",
    },
    {
      q: "How do we process your information?",
      a: "We process your information to provide, improve, and administer our Services, communicate with you, support security and fraud prevention, and comply with law.",
    },
    {
      q: "With whom do we share personal information?",
      a: "We may share information in specific situations, including with service providers, affiliates, business partners, or as needed for business operations.",
    },
    {
      q: "How do we keep your information safe?",
      a: "We use organizational and technical safeguards to protect personal information, but no electronic transmission or storage method can be guaranteed to be fully secure.",
    },
    {
      q: "What are your rights?",
      a: "Depending on where you are located, you may have rights to access, correct, delete, or receive a copy of your personal information.",
    },
  ];

  const tableRows = [
    ["A. Identifiers", "Name, postal address, phone number, email address, IP address, account name, and similar contact details.", "YES"],
    ["B. California Customer Records information", "Name, contact information, education, employment, employment history, and financial information.", "YES"],
    ["C. Protected classification characteristics", "Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data.", "YES"],
    ["D. Commercial information", "Transaction information, purchase history, financial details, and payment information.", "NO"],
    ["E. Biometric information", "Fingerprints and voiceprints.", "NO"],
    ["F. Internet or network activity", "Browsing history, search history, online behavior, interest data, and interactions with websites or applications.", "NO"],
    ["G. Geolocation data", "Device location.", "NO"],
    ["H. Audio, electronic, sensory, or similar information", "Images, audio, video, or call recordings created in connection with business activities.", "NO"],
    ["I. Professional or employment-related information", "Business contact details, job title, work history, and professional qualifications.", "YES"],
    ["J. Education information", "Student records and directory information.", "NO"],
    ["K. Inferences", "Inferences drawn from collected personal information to create a profile or summary about preferences or characteristics.", "YES"],
    ["L. Sensitive personal information", "Contents of email or text messages, debit or credit card numbers, and health data.", "YES"],
  ];

  const tocItems = [
    "What Information Do We Collect?",
    "How Do We Process Your Information?",
    "When and With Whom Do We Share Your Personal Information?",
    "Do We Use Cookies and Other Tracking Technologies?",
    "How Long Do We Keep Your Information?",
    "How Do We Keep Your Information Safe?",
    "Do We Collect Information From Minors?",
    "What Are Your Privacy Rights?",
    "Controls for Do-Not-Track Features",
    "Do United States Residents Have Specific Privacy Rights?",
    "Do We Make Updates to This Notice?",
    "How Can You Contact Us About This Notice?",
    "How Can You Review, Update, or Delete the Data We Collect From You?",
  ];

  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <header style={heroStyle}>
          <div style={logoStyle}>The Healing Directory</div>
          <h1 style={h1Style}>Privacy Policy</h1>
          <div style={dateStyle}>Last updated April 24, 2025</div>
        </header>

        <Section>
          <P>
            This Privacy Notice for The Healing Directory, “we,” “us,” or “our,” describes how and why we might access, collect, store, use, and/or share your personal information when you use our services.
          </P>

          <List
            items={[
              "Visit our website at https://www.thehealingdirectory.com, or any website of ours that links to this Privacy Notice.",
              "Use Healing Match Directory, a curated directory of wellness providers and personalized matching service that connects users with therapists, coaches, doctors, yoga instructors, nutritionists, and other healing professionals.",
              "Engage with us in other related ways, including sales, marketing, events, inquiries, forms, or provider directory participation.",
            ]}
          />

          <P>
            We do not provide medical, therapeutic, or mental health services directly. We do not guarantee the outcome of services rendered by providers listed on our platform. Provider recommendations are made based on information submitted through our forms, and users are responsible for conducting their own due diligence before beginning services with any provider.
          </P>

          <P>
            Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. You may contact us at{" "}
            <a style={linkStyle} href="mailto:jointhehealingdirectory@gmail.com">
              jointhehealingdirectory@gmail.com
            </a>
            .
          </P>
        </Section>

        <Section num="Summary" title="Summary of Key Points">
          <P>This summary provides key points from our Privacy Notice.</P>

          {summaryCards.map((card, index) => (
            <div key={index} style={cardStyle}>
              <div style={questionStyle}>{card.q}</div>
              <div style={answerStyle}>{card.a}</div>
            </div>
          ))}
        </Section>

        <Section>
          <div style={tocStyle}>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "20px",
                fontWeight: "400",
                marginBottom: "16px",
                color: colors.accent,
                letterSpacing: "0.04em",
              }}
            >
              Table of Contents
            </div>

            <ol style={{ paddingLeft: "22px", margin: "0" }}>
              {tocItems.map((item, index) => (
                <li key={index} style={{ ...liStyle, color: colors.muted }}>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section num="01" title="What Information Do We Collect?">
          <H3>Personal information you disclose to us</H3>
          <Short>In Short: We collect personal information that you provide to us.</Short>

          <P>
            We collect personal information that you voluntarily provide to us when you register on the Services, express interest in our products or Services, participate in activities on the Services, complete a form, submit a directory profile, or otherwise contact us.
          </P>

          <H3>Personal Information Provided by You</H3>
          <P>The personal information we collect may include:</P>

          <List
            items={[
              "Names",
              "Phone numbers",
              "Email addresses",
              "Job titles",
              "Contact preferences",
              "Billing addresses",
              "Debit or credit card information when payments are made",
            ]}
          />

          <H3>Sensitive Information</H3>
          <P>When necessary, with your consent or as otherwise permitted by applicable law, we may process sensitive information, including:</P>

          <List
            items={[
              "Health-related information",
              "Information about sex life or sexual orientation",
              "Information revealing race or ethnic origin",
              "Information revealing political opinions",
              "Information revealing religious or philosophical beliefs",
            ]}
          />

          <H3>Payment Data</H3>
          <P>
            We may collect data necessary to process your payment if you make purchases, such as your payment instrument number and security code. Payment data is handled and stored by Stripe. Stripe’s privacy notice can be found at{" "}
            <a style={linkStyle} href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
              https://stripe.com/privacy
            </a>
            .
          </P>

          <P>
            All personal information you provide to us must be true, complete, and accurate, and you must notify us of any changes.
          </P>

          <H3>Information automatically collected</H3>
          <Short>
            In Short: Some information, such as your IP address and browser or device characteristics, is collected automatically when you visit our Services.
          </Short>

          <P>
            We automatically collect certain information when you visit, use, or navigate the Services. This may include device and usage information, such as your IP address, browser type, device characteristics, operating system, language preferences, referring URLs, country, location, and information about how and when you use our Services.
          </P>

          <P>
            <strong style={{ fontWeight: "500" }}>Log and Usage Data.</strong> Log and usage data is service-related, diagnostic, usage, and performance information automatically collected when you access or use our Services.
          </P>
        </Section>

        <Section num="02" title="How Do We Process Your Information?">
          <Short>
            In Short: We process your information to provide, improve, and administer our Services, communicate with you, support security and fraud prevention, and comply with law.
          </Short>

          <P>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</P>

          <List
            items={[
              "To facilitate account creation, authentication, and user account management.",
              "To deliver and facilitate delivery of requested services.",
              "To respond to inquiries and offer support.",
              "To send administrative information, including updates to terms and policies.",
              "To fulfill and manage orders, payments, returns, and exchanges.",
              "To enable user-to-user communications when relevant.",
              "To request feedback.",
              "To send marketing and promotional communications in accordance with your preferences.",
              "To deliver personalized content or advertising when applicable.",
              "To protect our Services through fraud monitoring and prevention.",
              "To evaluate and improve our Services, products, marketing, and user experience.",
              "To comply with legal obligations.",
            ]}
          />
        </Section>

        <Section num="03" title="When and With Whom Do We Share Your Personal Information?">
          <Short>In Short: We may share information in specific situations described in this section.</Short>

          <P>We may need to share your personal information in the following situations:</P>

          <List
            items={[
              "Business Transfers: We may share or transfer information in connection with a merger, sale of company assets, financing, or acquisition.",
              "Affiliates: We may share information with affiliates, in which case we will require those affiliates to honor this Privacy Notice.",
              "Business Partners: We may share information with business partners to offer certain products, services, or promotions.",
              "Other Users: When you share personal information or interact with public areas of the Services, that information may be viewed by other users.",
            ]}
          />
        </Section>

        <Section num="04" title="Do We Use Cookies and Other Tracking Technologies?">
          <Short>In Short: We may use cookies and other tracking technologies to collect and store your information.</Short>

          <P>
            We may use cookies and similar tracking technologies, such as web beacons and pixels, to gather information when you interact with our Services. These technologies may help with security, account functionality, bug prevention, saved preferences, and basic site functions.
          </P>

          <P>
            We may also permit third parties and service providers to use tracking technologies for analytics and advertising, including to help display advertisements or tailor content to your interests.
          </P>

          <P>
            To opt out of applicable online tracking technologies, you may email us directly at{" "}
            <a style={linkStyle} href="mailto:jointhehealingdirectory@gmail.com">
              jointhehealingdirectory@gmail.com
            </a>
            .
          </P>

          <H3>Google Analytics</H3>
          <P>
            We may share information with Google Analytics to track and analyze use of the Services. To opt out of being tracked by Google Analytics, visit{" "}
            <a style={linkStyle} href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer">
              https://tools.google.com/dlpage/gaoptout
            </a>
            .
          </P>
        </Section>

        <Section num="05" title="How Long Do We Keep Your Information?">
          <Short>
            In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.
          </Short>

          <P>
            We only keep personal information for as long as necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law, such as tax, accounting, or legal requirements.
          </P>

          <P>
            When we have no ongoing legitimate business need to process your personal information, we will delete or anonymize it. If deletion is not immediately possible, we will securely store the information and isolate it from further processing until deletion is possible.
          </P>
        </Section>

        <Section num="06" title="How Do We Keep Your Information Safe?">
          <Short>In Short: We aim to protect your personal information through organizational and technical security measures.</Short>

          <P>
            We have implemented appropriate and reasonable security measures designed to protect personal information. However, no electronic transmission over the Internet or information storage technology can be guaranteed to be completely secure. You should only access the Services within a secure environment.
          </P>
        </Section>

        <Section num="07" title="Do We Collect Information From Minors?">
          <Short>In Short: We do not knowingly collect data from or market to children under 18 years of age.</Short>

          <P>
            We do not knowingly collect, solicit data from, or market to children under 18 years of age. If we learn that personal information from users under 18 has been collected, we will deactivate the account and take reasonable measures to delete such data from our records.
          </P>

          <P>
            If you become aware of data we may have collected from children under 18, please contact us at{" "}
            <a style={linkStyle} href="mailto:jointhehealingdirectory@gmail.com">
              jointhehealingdirectory@gmail.com
            </a>
            .
          </P>
        </Section>

        <Section num="08" title="What Are Your Privacy Rights?">
          <Short>
            In Short: You may review, change, or terminate your account at any time, depending on your location.
          </Short>

          <P>
            <strong style={{ fontWeight: "500" }}>Withdrawing your consent:</strong> If we rely on your consent to process your personal information, you have the right to withdraw that consent at any time by contacting us.
          </P>

          <P>
            <strong style={{ fontWeight: "500" }}>Opting out of marketing communications:</strong> You can unsubscribe from marketing and promotional communications at any time by clicking the unsubscribe link in our emails, contacting us directly, or using the contact details in this policy.
          </P>

          <H3>Account Information</H3>
          <P>
            If you would like to review, change, or terminate your account, you may contact us using the contact information provided below.
          </P>

          <P>
            Upon request to terminate your account, we will deactivate or delete your account and information from active databases. We may retain some information as needed to prevent fraud, troubleshoot problems, assist investigations, enforce legal terms, or comply with legal requirements.
          </P>
        </Section>

        <Section num="09" title="Controls for Do-Not-Track Features">
          <P>
            Most web browsers and some mobile operating systems include a Do-Not-Track feature or setting. At this stage, no uniform technology standard for recognizing and implementing Do-Not-Track signals has been finalized. As such, we do not currently respond to Do-Not-Track browser signals.
          </P>

          <P>
            California law requires us to let you know how we respond to web browser Do-Not-Track signals. Because there is currently no industry or legal standard for recognizing or honoring these signals, we do not respond to them at this time.
          </P>
        </Section>

        <Section num="10" title="Do United States Residents Have Specific Privacy Rights?">
          <Short>
            In Short: If you are a resident of certain US states, you may have rights to request access to, correction of, deletion of, or a copy of your personal information.
          </Short>

          <H3>Categories of Personal Information We Collect</H3>
          <P>We have collected the following categories of personal information in the past twelve months:</P>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Examples</th>
                  <th style={thStyle}>Collected</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>{row[0]}</td>
                    <td style={tdStyle}>{row[1]}</td>
                    <td
                      style={{
                        ...tdStyle,
                        color: row[2] === "YES" ? colors.accent : colors.muted,
                        fontWeight: row[2] === "YES" ? "500" : "300",
                      }}
                    >
                      {row[2]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <P>
            We only collect sensitive personal information as defined by applicable privacy laws for purposes allowed by law or with your consent. We do not collect or process sensitive personal information for the purpose of inferring characteristics about you.
          </P>

          <H3>Your Rights</H3>
          <P>Your rights may include:</P>

          <List
            items={[
              "Right to know whether or not we are processing your personal data.",
              "Right to access your personal data.",
              "Right to correct inaccuracies in your personal data.",
              "Right to request deletion of your personal data.",
              "Right to obtain a copy of the personal data you previously shared with us.",
              "Right to non-discrimination for exercising your rights.",
              "Right to opt out of certain processing, including targeted advertising, sale of personal data, or profiling when applicable.",
            ]}
          />

          <H3>How to Exercise Your Rights</H3>
          <P>
            To exercise these rights, you can email us at{" "}
            <a style={linkStyle} href="mailto:jointhehealingdirectory@gmail.com">
              jointhehealingdirectory@gmail.com
            </a>
            .
          </P>

          <H3>Request Verification</H3>
          <P>
            Upon receiving your request, we may need to verify your identity to determine you are the same person about whom we have information in our system.
          </P>

          <H3>Appeals</H3>
          <P>
            Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us.
          </P>

          <H3>California Shine The Light Law</H3>
          <P>
            California Civil Code Section 1798.83 permits California residents to request, once a year and free of charge, information about categories of personal information disclosed to third parties for direct marketing purposes.
          </P>
        </Section>

        <Section num="11" title="Do We Make Updates to This Notice?">
          <Short>In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.</Short>

          <P>
            We may update this Privacy Notice from time to time. The updated version will be indicated by an updated revised date at the top. If we make material changes, we may notify you by posting a notice or sending a direct notification.
          </P>
        </Section>

        <Section num="12" title="How Can You Contact Us About This Notice?">
          <P>
            If you have questions or comments about this notice, you may email us at{" "}
            <a style={linkStyle} href="mailto:jointhehealingdirectory@gmail.com">
              jointhehealingdirectory@gmail.com
            </a>{" "}
            or contact us by post at:
          </P>

          <div style={cardStyle}>
            <P>The Healing Directory</P>
            <P>1907 Deptford Center Rd ste 3, Deptford, NJ 08096, USA</P>
            <P>Deptford, NJ 08096</P>
            <P>United States</P>
          </div>
        </Section>

        <Section num="13" title="How Can You Review, Update, or Delete the Data We Collect From You?" last>
          <P>
            You have the right to request access to the personal information we collect from you, details about how we have processed it, correction of inaccuracies, or deletion of your personal information. You may also have the right to withdraw consent to our processing of your personal information.
          </P>

          <P>
            To request to review, update, or delete your personal information, please email us directly at{" "}
            <a style={linkStyle} href="mailto:jointhehealingdirectory@gmail.com">
              jointhehealingdirectory@gmail.com
            </a>
            .
          </P>
        </Section>
      </div>
    </div>
  );
}