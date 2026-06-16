import React from "react";

export default function TermsPage() {
  const colors = {
    sage: "#7a9e7e",
    cream: "#f7f3ee",
    warm: "#e8e0d4",
    text: "#2c2c28",
    muted: "#7a7a6e",
    accent: "#4a7c59",
    white: "#ffffff",
  };

  const wrap = {
    width: "100%",
    background: colors.cream,
    color: colors.text,
    fontFamily: "Jost, Arial, sans-serif",
    boxSizing: "border-box",
  };

  const page = {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "clamp(32px, 6vw, 56px) clamp(18px, 5vw, 32px) 72px",
    boxSizing: "border-box",
  };

  const hero = {
    textAlign: "center",
    padding: "36px 0 44px",
    borderBottom: "1px solid " + colors.warm,
    marginBottom: "42px",
  };

  const logo = {
    fontFamily: "Georgia, serif",
    fontSize: "13px",
    fontWeight: "300",
    letterSpacing: "0.28em",
    color: colors.sage,
    textTransform: "uppercase",
    marginBottom: "18px",
  };

  const h1 = {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(40px, 8vw, 56px)",
    fontWeight: "300",
    color: colors.text,
    lineHeight: "1.05",
    margin: "0 0 10px",
  };

  const date = {
    fontSize: "13px",
    fontWeight: "300",
    color: colors.muted,
    letterSpacing: "0.1em",
  };

  const section = {
    marginBottom: "42px",
    paddingBottom: "42px",
    borderBottom: "1px solid " + colors.warm,
  };

  const sectionNum = {
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.18em",
    color: colors.sage,
    textTransform: "uppercase",
    marginBottom: "8px",
  };

  const h2 = {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(26px, 5vw, 32px)",
    fontWeight: "300",
    margin: "0 0 22px",
    color: colors.text,
    lineHeight: "1.2",
  };

  const h3 = {
    fontSize: "14px",
    fontWeight: "500",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: colors.accent,
    margin: "28px 0 10px",
  };

  const p = {
    fontSize: "14px",
    fontWeight: "300",
    lineHeight: "1.9",
    color: colors.text,
    margin: "0 0 16px",
  };

  const li = {
    fontSize: "14px",
    fontWeight: "300",
    lineHeight: "1.85",
    color: colors.text,
    marginBottom: "6px",
  };

  const card = {
    background: colors.white,
    border: "1px solid " + colors.warm,
    borderRadius: "8px",
    padding: "22px",
    marginBottom: "16px",
  };

  const short = {
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

  const link = {
    color: colors.accent,
    textDecoration: "none",
    borderBottom: "1px solid rgba(74, 124, 89, 0.35)",
    wordBreak: "break-word",
  };

  function Section({ number, title, children, last }) {
    return (
      <section style={{ ...section, borderBottom: last ? "none" : section.borderBottom }}>
        {number ? <div style={sectionNum}>{number}</div> : null}
        {title ? <h2 style={h2}>{title}</h2> : null}
        {children}
      </section>
    );
  }

  function P({ children }) {
    return <p style={p}>{children}</p>;
  }

  function H3({ children }) {
    return <h3 style={h3}>{children}</h3>;
  }

  function List({ items }) {
    return (
      <ul style={{ paddingLeft: "22px", margin: "0 0 18px" }}>
        {items.map((item, index) => (
          <li key={index} style={li}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  const toc = [
    "Our Services",
    "Intellectual Property Rights",
    "User Representations",
    "Prohibited Activities",
    "User Generated Contributions",
    "Contribution License",
    "Services Management",
    "Term and Termination",
    "Modifications and Interruptions",
    "Governing Law",
    "Dispute Resolution",
    "Corrections",
    "Disclaimer",
    "Limitations of Liability",
    "Indemnification",
    "User Data",
    "Electronic Communications, Transactions, and Signatures",
    "Miscellaneous",
    "Contact Us",
  ];

  const prohibited = [
    "Systematically retrieve data or content from the Services to create or compile a collection, database, or directory without written permission.",
    "Trick, defraud, or mislead us or other users, especially to learn sensitive account information.",
    "Interfere with security-related features of the Services.",
    "Disparage, tarnish, or otherwise harm us or the Services.",
    "Use information from the Services to harass, abuse, or harm another person.",
    "Submit false reports of abuse or misconduct.",
    "Use the Services in a manner inconsistent with applicable laws or regulations.",
    "Engage in unauthorized framing of or linking to the Services.",
    "Upload or transmit viruses, Trojan horses, spam, or other disruptive material.",
    "Use automated systems, scripts, data mining, robots, or similar tools.",
    "Delete copyright or proprietary rights notices from any Content.",
    "Attempt to impersonate another user or person.",
    "Upload or transmit spyware, tracking pixels, web bugs, cookies, or similar collection mechanisms.",
    "Interfere with, disrupt, or create an undue burden on the Services.",
    "Harass, annoy, intimidate, or threaten our employees or agents.",
    "Attempt to bypass access restrictions or security measures.",
    "Copy, adapt, decipher, decompile, disassemble, or reverse engineer any software used by the Services except as permitted by law.",
    "Use the Services as part of an effort to compete with us or for unauthorized revenue-generating activity.",
  ];

  return (
    <div style={wrap}>
      <div style={page}>
        <header style={hero}>
          <div style={logo}>The Healing Directory</div>
          <h1 style={h1}>Terms of Use</h1>
          <div style={date}>Last updated April 24, 2025</div>
        </header>

        <Section title="Agreement to Our Legal Terms">
          <P>
            We are The Healing Directory, also referred to in these Terms as “Company,” “we,” “us,” or “our.”
          </P>

          <P>
            These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity, and The Healing Directory, concerning your access to and use of our Services.
          </P>

          <P>
            By accessing the Services, you agree that you have read, understood, and agreed to be bound by all of these Legal Terms. If you do not agree with all of these Legal Terms, you are expressly prohibited from using the Services and must discontinue use immediately.
          </P>

          <P>
            Supplemental terms, conditions, or documents that may be posted on the Services from time to time are incorporated into these Legal Terms by reference. We reserve the right to make changes or modifications to these Legal Terms at any time and for any reason.
          </P>

          <P>
            You can contact us by email at{" "}
            <a style={link} href="mailto:jointhehealingdirectory@gmail.com">
              jointhehealingdirectory@gmail.com
            </a>{" "}
            or by mail at 1907 Deptford Center Road STE 3, Deptford, NJ 08096, United States.
          </P>
        </Section>

        <Section title="Table of Contents">
          <div style={card}>
            <ol style={{ paddingLeft: "22px", margin: "0" }}>
              {toc.map((item, index) => (
                <li key={index} style={{ ...li, color: colors.muted }}>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section number="01" title="Our Services">
          <P>
            The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation.
          </P>

          <P>
            Those who choose to access the Services from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws apply.
          </P>
        </Section>

        <Section number="02" title="Intellectual Property Rights">
          <H3>Our intellectual property</H3>

          <P>
            We are the owner or licensee of all intellectual property rights in our Services, including source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics, collectively called the “Content,” as well as trademarks, service marks, and logos, collectively called the “Marks.”
          </P>

          <P>
            Our Content and Marks are protected by copyright, trademark, intellectual property, unfair competition laws, and treaties around the world. The Content and Marks are provided through the Services “as is” for your personal, non-commercial use or internal business purpose only.
          </P>

          <H3>Your use of our Services</H3>

          <P>
            Subject to your compliance with these Legal Terms, we grant you a non-exclusive, non-transferable, revocable license to access the Services and download or print a copy of any portion of the Content to which you have properly gained access, solely for your personal, non-commercial use or internal business purpose.
          </P>

          <P>
            No part of the Services, Content, or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for commercial purpose without our prior written permission.
          </P>

          <P>
            We reserve all rights not expressly granted to you. Any breach of these intellectual property rights will constitute a material breach of these Legal Terms and your right to use the Services will terminate immediately.
          </P>

          <H3>Your submissions</H3>

          <P>
            By sending us any question, comment, suggestion, idea, feedback, or other information about the Services, called “Submissions,” you agree to assign to us all intellectual property rights in such Submission. You agree that we may use and share the Submission for any lawful purpose, commercial or otherwise, without acknowledgment or compensation to you.
          </P>

          <P>
            You are solely responsible for your Submissions and agree that they will not be illegal, harassing, hateful, harmful, defamatory, obscene, abusive, discriminatory, threatening, sexually explicit, false, inaccurate, deceitful, or misleading.
          </P>
        </Section>

        <Section number="03" title="User Representations">
          <P>By using the Services, you represent and warrant that:</P>

          <List
            items={[
              "You have the legal capacity and agree to comply with these Legal Terms.",
              "You are not a minor in the jurisdiction in which you reside.",
              "You will not access the Services through automated or non-human means.",
              "You will not use the Services for any illegal or unauthorized purpose.",
              "Your use of the Services will not violate any applicable law or regulation.",
            ]}
          />

          <P>
            If you provide information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse current or future use of the Services.
          </P>
        </Section>

        <Section number="04" title="Prohibited Activities">
          <P>
            You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with commercial endeavors except those specifically endorsed or approved by us.
          </P>

          <P>As a user of the Services, you agree not to:</P>

          <List items={prohibited} />
        </Section>

        <Section number="05" title="User Generated Contributions">
          <P>
            The Services may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or through the Services, including text, writings, video, audio, photographs, graphics, comments, suggestions, personal information, or other material, collectively called “Contributions.”
          </P>

          <P>
            Contributions may be viewable by other users of the Services and through third-party websites. When you create or make available any Contributions, you represent and warrant that you have the necessary rights and that your Contributions comply with these Legal Terms.
          </P>
        </Section>

        <Section number="06" title="Contribution License">
          <P>
            You and the Services agree that we may access, store, process, and use any information and personal data that you provide, as well as your choices and settings.
          </P>

          <P>
            By submitting suggestions or other feedback regarding the Services, you agree that we can use and share such feedback for any purpose without compensation to you.
          </P>

          <P>
            We do not assert ownership over your Contributions. You retain ownership of your Contributions and any related intellectual property rights. You are solely responsible for your Contributions and agree to release us from responsibility regarding them.
          </P>
        </Section>

        <Section number="07" title="Services Management">
          <P>We reserve the right, but not the obligation, to:</P>

          <List
            items={[
              "Monitor the Services for violations of these Legal Terms.",
              "Take appropriate legal action against anyone who violates the law or these Legal Terms.",
              "Refuse, restrict access to, limit availability of, or disable any Contributions or portion of them.",
              "Remove or disable files and content that are excessive in size or burdensome to our systems.",
              "Manage the Services in a manner designed to protect our rights and property and support proper functioning of the Services.",
            ]}
          />
        </Section>

        <Section number="08" title="Term and Termination">
          <P>
            These Legal Terms remain in full force and effect while you use the Services. We reserve the right, in our sole discretion and without notice or liability, to deny access to and use of the Services to any person for any reason or no reason.
          </P>

          <P>
            We may terminate your use or participation in the Services or delete any content or information that you posted at any time, without warning, in our sole discretion.
          </P>

          <P>
            If we terminate or suspend your account, you are prohibited from registering and creating a new account under your name, a fake name, borrowed name, or the name of any third party.
          </P>
        </Section>

        <Section number="09" title="Modifications and Interruptions">
          <P>
            We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice. We have no obligation to update information on our Services.
          </P>

          <P>
            We cannot guarantee that the Services will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance, resulting in interruptions, delays, or errors.
          </P>

          <P>
            We will not be liable for any loss, damage, or inconvenience caused by your inability to access or use the Services during downtime, suspension, or discontinuance.
          </P>
        </Section>

        <Section number="10" title="Governing Law">
          <P>
            These Legal Terms shall be governed by and defined following the laws of the State of New Jersey, USA. The Healing Directory and you agree that the courts of Camden County shall have exclusive jurisdiction to resolve any dispute arising in connection with these Legal Terms.
          </P>
        </Section>

        <Section number="11" title="Dispute Resolution">
          <H3>Informal Negotiations</H3>

          <P>
            To expedite resolution and control the cost of any dispute, controversy, or claim related to these Legal Terms, the parties agree to first attempt to negotiate any dispute informally for at least thirty days before initiating arbitration.
          </P>

          <H3>Binding Arbitration</H3>

          <P>
            Any dispute arising out of or in connection with these Legal Terms shall be referred to and finally resolved by arbitration. The number of arbitrators shall be one. The seat or legal place of arbitration shall be Camden County, New Jersey, USA. The language of the proceedings shall be English.
          </P>

          <H3>Restrictions</H3>

          <P>
            Any arbitration shall be limited to the dispute between the parties individually. No arbitration shall be joined with any other proceeding, and there is no right for any dispute to be arbitrated on a class-action basis.
          </P>

          <H3>Exceptions</H3>

          <P>
            Disputes related to intellectual property rights, allegations of theft, piracy, invasion of privacy, unauthorized use, or claims for injunctive relief are not subject to the informal negotiations and arbitration provisions above.
          </P>
        </Section>

        <Section number="12" title="Corrections">
          <P>
            There may be information on the Services that contains typographical errors, inaccuracies, or omissions, including descriptions, pricing, availability, and other information. We reserve the right to correct errors, inaccuracies, or omissions and to change or update information at any time without prior notice.
          </P>
        </Section>

        <Section number="13" title="Disclaimer">
          <p style={short}>
            The Services are provided on an as-is and as-available basis. Your use of the Services is at your sole risk.
          </p>

          <P>
            To the fullest extent permitted by law, we disclaim all warranties, express or implied, in connection with the Services and your use of them, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </P>

          <P>
            We make no warranties or representations about the accuracy or completeness of the Services’ content or the content of any websites or mobile applications linked to the Services.
          </P>

          <P>
            We do not warrant, endorse, guarantee, or assume responsibility for any product or service advertised or offered by a third party through the Services, any hyperlinked website, or any website or mobile application featured in any advertising.
          </P>
        </Section>

        <Section number="14" title="Limitations of Liability">
          <P>
            In no event will we, our directors, employees, or agents be liable to you or any third party for direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the Services.
          </P>

          <P>
            Certain state or international laws do not allow limitations on implied warranties or exclusion of certain damages. If these laws apply to you, some or all of the above disclaimers or limitations may not apply, and you may have additional rights.
          </P>
        </Section>

        <Section number="15" title="Indemnification">
          <P>
            You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys’ fees and expenses, made by any third party due to or arising out of your use of the Services, breach of these Legal Terms, violation of your representations and warranties, violation of third-party rights, or harmful act toward another user.
          </P>

          <P>
            We reserve the right, at your expense, to assume the exclusive defense and control of any matter for which you are required to indemnify us. You agree to cooperate with our defense of such claims.
          </P>
        </Section>

        <Section number="16" title="User Data">
          <P>
            We will maintain certain data that you transmit to the Services for the purpose of managing performance of the Services, as well as data relating to your use of the Services.
          </P>

          <P>
            Although we perform routine backups of data, you are solely responsible for all data that you transmit or that relates to your activity using the Services. You agree that we have no liability for any loss or corruption of such data.
          </P>
        </Section>

        <Section number="17" title="Electronic Communications, Transactions, and Signatures">
          <P>
            Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications and agree that all agreements, notices, disclosures, and other communications we provide electronically satisfy any legal requirement that such communication be in writing.
          </P>

          <P>
            You agree to the use of electronic signatures, contracts, orders, and other records, and to electronic delivery of notices, policies, and records of transactions initiated or completed by us or through the Services.
          </P>
        </Section>

        <Section number="18" title="Miscellaneous">
          <P>
            These Legal Terms and any policies or operating rules posted by us on the Services constitute the entire agreement and understanding between you and us.
          </P>

          <P>
            Our failure to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver. If any provision is determined to be unlawful, void, or unenforceable, that provision is deemed severable and does not affect the validity of the remaining provisions.
          </P>

          <P>
            There is no joint venture, partnership, employment, or agency relationship created between you and us as a result of these Legal Terms or use of the Services.
          </P>
        </Section>

        <Section number="19" title="Contact Us" last>
          <P>
            In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:
          </P>

          <div style={card}>
            <P>
              <a style={link} href="mailto:jointhehealingdirectory@gmail.com">
                jointhehealingdirectory@gmail.com
              </a>
            </P>
            <P>1907 Deptford Center Road STE 3</P>
            <P>Deptford, NJ 08096</P>
            <P>United States</P>
          </div>
        </Section>
      </div>
    </div>
  );
}