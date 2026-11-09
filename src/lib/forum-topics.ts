export const forumTopics = [
  {
    slug: "how-to-apply-for-staff",
    title: "How to apply for staff",
    author: "Will Norbury",
    category: "Staff applications",
    pinned: true,
    summary: "Joining the Warden Network staff team starts with an application.",
    sections: [
      { title: "Before you apply", body: "Read the community rules and think about why you want to join the team. Be honest about your experience and what you can contribute." },
      { title: "Start your application", body: "Sign in to your website account and visit the Apply page. Choose the staff application when it is available and accepting applications." },
      { title: "Tell us about yourself", body: "Fill out the requested details, describe your experience, and explain why you want to become staff. Review your answers before submitting." },
      { title: "After submitting", body: "You can check your application status from your Dashboard or the Applications page. If you need help, contact the team through the Support Centre." },
    ],
  },
];

export function findForumTopic(slug: string | undefined) {
  return forumTopics.find((topic) => topic.slug === slug);
}