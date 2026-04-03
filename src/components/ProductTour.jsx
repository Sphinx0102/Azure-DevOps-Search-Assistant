import { ACTIONS, Joyride, STATUS } from "react-joyride";
import { TOUR_STEPS } from "../data/tourConfig";

function ProductTour({ run, tourKey, onTourEnd }) {
  const handleJoyrideEvent = (data) => {
    const { action, status } = data;

    if (action === ACTIONS.CLOSE) {
      onTourEnd();
      return;
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onTourEnd();
    }
  };

  return (
    <Joyride
      key={tourKey}
      run={run}
      steps={TOUR_STEPS}
      onEvent={handleJoyrideEvent}
      continuous
      showProgress
      scrollToFirstStep
      disableScrolling={false}
      disableCloseOnEsc={false}
      options={{
        buttons: ["skip", "back", "close", "primary"],
        backgroundColor: "#14233a",
        primaryColor: "#38bdf8",
        textColor: "#e2e8f0",
        overlayColor: "rgba(2, 8, 23, 0.76)",
        width: 380,
        zIndex: 10000,
      }}
      locale={{
        back: "Atras",
        close: "Cerrar",
        last: "Finalizar",
        next: "Siguiente",
        skip: "Omitir",
      }}
      styles={{
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          color: "#f8fafc",
        },
        tooltipContent: {
          color: "#cbd5e1",
        },
        buttonBack: {
          color: "#94a3b8",
        },
        buttonClose: {
          color: "#94a3b8",
        },
        buttonSkip: {
          color: "#94a3b8",
        },
      }}
    />
  );
}

export default ProductTour;
