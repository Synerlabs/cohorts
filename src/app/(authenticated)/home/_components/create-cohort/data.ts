import CreateCohortForm from "@/app/(authenticated)/home/_components/create-cohort/0-full-name";
import AlternateNameForm from "@/app/(authenticated)/home/_components/create-cohort/1-alternate-name-form";
import SlugForm from "@/app/(authenticated)/home/_components/create-cohort/2-slug";
import PrimaryCategoryForm from "@/app/(authenticated)/home/_components/create-cohort/3-primary-category";
import DescriptionForm from "@/app/(authenticated)/home/_components/create-cohort/4-description";
import FinalizeForm from "@/app/(authenticated)/home/_components/create-cohort/5-finalize";

export const cohortWizardData = [
  {
    title: "Let's start",
    description: "What's the full name of your organization?",
    subDescription: "",
    Component: CreateCohortForm,
  },
  {
    title: "Alternate name",
    description: "Do you have a shorter name or an abbreviation?",
    subDescription: "",
    Component: AlternateNameForm,
  },
  {
    title: "Slug",
    description: "Let's create a unique slug for your organization",
    subDescription: "",
    Component: SlugForm,
  },
  {
    title: "Category",
    description: "What is the primary Category of your organization?",
    subDescription:
      "Please choose the category that best describes your organization.",
    Component: PrimaryCategoryForm,
  },
  {
    title: "Description",
    description: "Describe your organization in a few sentences",
    subDescription: "",
    Component: DescriptionForm,
  },
  {
    title: "Finalize",
    description: "",
    subDescription: "",
    Component: FinalizeForm,
  },
];
