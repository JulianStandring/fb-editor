RSpec.describe Branch do
  subject(:branch) do
    described_class.new(branch_attributes)
  end
  let(:attributes) { {} }
  let(:branch_attributes) do
    {
      previous_flow_object: previous_flow_object,
      service: service
    }.merge(attributes)
  end
  let(:previous_flow_object) do
    service.find_page_by_url('holiday')
  end

  describe '#conditionals_attributes=' do
    let(:attributes) do
      {
        conditionals_attributes: [
          {
          }
        ]
      }
      # >> => params[:branch][:conditionals_attributes]
      #   {
      #     '0' =>
      #       <ActionController::Parameters {
      #         "page"=>"3bbf86fc-701f-4cb6-8083-12404b293da0",
      #         "expressions_attributes" => {
      #           '0' => {
      #             "operator" => "is",
      #             "question"=>"d1c04d9e-877f-4219-a96f-e21dde925f4b",
      #             "field" => "some-uuid"
      #           },
      #           '1' => {
      #             "operator" => "is",
      #             "question"=>"d1c04d9e-877f-4219-a96f-e21dde925f4b",
      #             "field" => "some-uuid"
      #           }
      #         }
      #       } permitted: false>,
      #     '1' => { ... } # another conditional
      #   }
    end
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

  describe '#previous_flow_uuid' do
    it 'returns the uuid of the previous flow object' do
      expect(branch.previous_flow_uuid).to eq(previous_flow_object.uuid)
    end
  end

  describe '#previous_flow_title' do
    it 'returns the title of the previous flow object' do
      expect(branch.previous_flow_title).to eq(previous_flow_object.title)
    end
  end

  describe '#previous_pages' do
    it 'returns all previously visited pages including the previous flow object' do
      expected_pages = service.pages[0..service.pages.index(previous_flow_object)]
      expect(branch.previous_pages).to eq(expected_pages)
    end
  end
end
