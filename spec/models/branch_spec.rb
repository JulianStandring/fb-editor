RSpec.describe Branch do
  subject(:branch) do
    described_class.new(
      previous_flow_object: previous_flow_object,
      service: service
    )
  end
  let(:previous_flow_object) do
    service.find_page_by_url('holiday')
  end

  describe '#pages' do
    it 'returns all pages' do
      expect(branch.pages.map { |page| page[0] }).to eq(
        [
          'Service name goes here',
          'Full name',
          'Email address',
          'Parent name',
          'Your age',
          'Family Hobbies',
          'Do you like Star Wars?',
          'What is the day that you like to take holidays?',
          'What would you like on your burger?',
          'How well do you know Star Wars?',
          'Tell me how many lights you see',
          'Upload your best dog photo',
          'Check your answers',
          'Complaint sent'
        ]
      )
    end
  end

  describe '#previous_questions' do
    let(:previous_flow_object) do
      service.find_page_by_url('dog-picture')
    end

    it 'returns previous questions (only radios and checkboxes)' do
      expect(branch.previous_questions.map { |question| question[0] }).to eq(
        [
          'Do you like Star Wars?',
          'What would you like on your burger?',
          "What is The Mandalorian's real name?"
        ]
      )
    end
  end
end
