import { Link } from "react-router-dom";
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";

const features = [
  {
    icon: CalendarDaysIcon,
    title: "Easy Scheduling",
    description:
      "Book appointments in just a few clicks with our intuitive calendar interface.",
  },
  {
    icon: ClockIcon,
    title: "Real-time Availability",
    description:
      "See available time slots instantly and never double-book again.",
  },
  {
    icon: CheckCircleIcon,
    title: "Instant Confirmation",
    description:
      "Get immediate booking confirmations and reminders for your appointments.",
  },
];

export function Home() {
  return (
    <div className="space-y-16">
      <section className="text-center py-12 sm:py-20">
        <h1 className="text-4xl sm:text-5xl font-bold text-surface-900 tracking-tight">
          Book with{" "}
          <span className="text-primary-600">confidence</span>
        </h1>
        <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
          The simplest way to manage your bookings. Schedule, track, and organize
          all your appointments in one place.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/bookings">
            <Button size="lg">View Bookings</Button>
          </Link>
          <Button variant="secondary" size="lg">
            Learn More
          </Button>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center">
              <div className="mx-auto w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-surface-500">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
