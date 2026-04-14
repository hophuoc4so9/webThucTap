import React from "react";

// Note: Sample components are placeholders. Import them when available.
// import SampleButton from "../Button/SampleButton";
// import SampleInput from "../Input/SampleInput";
// import SampleModal from "../Modal/SampleModal";

const SampleDemo: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-gray-500">
        Sample components are placeholders — import them when available.
      </p>
      {/* Uncomment when SampleButton, SampleInput, SampleModal are implemented:
      <div className="flex gap-2">
        <SampleButton onClick={() => setModalOpen(true)}>
          Open Modal
        </SampleButton>
        <SampleButton variant="secondary">Secondary</SampleButton>
        <SampleButton variant="danger">Danger</SampleButton>
      </div>
      <SampleInput
        label="Sample Input"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type something..."
      />
      <SampleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample Modal"
      >
        <p>This is a sample modal content.</p>
        <SampleButton onClick={() => setModalOpen(false)}>Close</SampleButton>
      </SampleModal>
      */}
    </div>
  );
};

export default SampleDemo;
