<?php

namespace KimaiPlugin\TimeSelectBundle\EventSubscriber;

use App\Event\ThemeEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Inlines time-select.js on every page (login and kiosk pages included, where it finds nothing to do).
 */
final class ThemeSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [ThemeEvent::JAVASCRIPT => ['addScript', 100]];
    }

    public function addScript(ThemeEvent $event): void
    {
        $js = file_get_contents(__DIR__ . '/../Resources/public/time-select.js');
        if ($js !== false) {
            $event->addContent('<script>' . $js . '</script>');
        }
    }
}
