export default function PrivacyPage() {
  return (
    <main className="container">
      <div className="flex flex-col py-12 space-y-6">
        <h1 className="text-3xl font-bold mb-4 text-[#4B1D22]">
          Privacy Policy
        </h1>
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground">
            At Conductor, we are committed to protecting your privacy.
          </p>
          <p className="font-medium text-muted-foreground">
            This Privacy Policy outlines how we collect, use, and safeguard your
            personal information when you use our services.
          </p>
        </div>
      </div>

      <section className="space-y-6 pb-12">
        <h2 className="text-xl font-semibold mb-4 text-[#6D1C24]">
          Information We Collect
        </h2>
        <p className="font-medium text-muted-foreground">
          We may collect personal information such as your name, email address,
          and usage data when you interact with our platform.
        </p>
        <h2 className="text-xl font-semibold mb-4 text-[#6D1C24]">
          How We Use Your Information
        </h2>
        <p className="font-medium text-muted-foreground">
          We use your information to provide and improve our services,
          communicate with you, and ensure the security of our platform.
        </p>
        <h2 className="text-xl font-semibold mb-4 text-[#6D1C24]">
          Data Security
        </h2>
        <p className="font-medium text-muted-foreground">
          We implement industry-standard security measures to protect your
          personal information from unauthorized access, disclosure, or
          alteration.
        </p>
        <h2 className="text-xl font-semibold mb-4 text-[#6D1C24]">
          Your Rights
        </h2>
        <p className="font-medium text-muted-foreground">
          You have the right to access, correct, or delete your personal
          information. You may also opt-out of certain communications from us.
        </p>
        <h2 className="text-xl font-semibold mb-4 text-[#6D1C24]">
          Changes to This Policy
        </h2>
        <p className="font-medium text-muted-foreground">
          We may update this Privacy Policy from time to time. We will notify
          you of any significant changes by posting the new policy on our
          website.
        </p>
      </section>
    </main>
  );
}
